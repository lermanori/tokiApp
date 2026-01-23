import { useState, useEffect } from 'react';
import { adminApi } from '../../services/adminApi';

interface TokiPreviewEditModalProps {
  toki: any;
  onClose: () => void;
  onSave: (updatedToki: any) => void;
}

export default function TokiPreviewEditModal({ toki, onClose, onSave }: TokiPreviewEditModalProps) {
  const [formData, setFormData] = useState({
    title: toki.title || '',
    description: toki.description || '',
    location: toki.location || '',
    category: toki.category || '',
    timeSlot: toki.timeSlot || '',
    scheduledTime: toki.scheduledTime || '',
    maxAttendees: toki.maxAttendees || '',
    visibility: toki.visibility || 'public',
    tags: Array.isArray(toki.tags) ? toki.tags.join(', ') : '',
    host_id: toki.host_id || '',
    latitude: toki.latitude || '',
    longitude: toki.longitude || '',
    externalLink: toki.externalLink || ''
  });

  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Load users on mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await adminApi.getUsers({ limit: 200 }) as any;
        setUsers(response.data?.users || []);
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };
    loadUsers();
  }, []);

  // Initialize userSearch when toki changes
  useEffect(() => {
    if (toki.host_id) {
      const user = users.find(u => u.id === toki.host_id);
      if (user) {
        setUserSearch(`${user.name} (${user.email})`);
      } else {
        setUserSearch('');
      }
    }
  }, [toki.host_id, users]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-user-dropdown]')) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedUser = users.find(u => u.id === formData.host_id);
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  ).slice(0, 10); // Limit to 10 results

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...toki,
      ...formData,
      tags: formData.tags ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null
    };
    onSave(updated);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }} onClick={onClose}>
      <div 
        className="glass-card" 
        style={{
          width: '100%',
          maxWidth: 600,
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
          padding: 24
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(0,0,0,0.1)',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            cursor: 'pointer',
            fontSize: 18
          }}
        >
          ✕
        </button>

        <h2 style={{
          fontSize: 24,
          fontFamily: 'var(--font-bold)',
          color: '#1C1C1C',
          marginBottom: 24
        }}>
          Edit Toki
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: 14,
                fontFamily: 'var(--font-semi)',
                color: '#1C1C1C',
                marginBottom: 8
              }}>
                Title *
              </label>
              <input
                className="input-glass"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: 14,
                fontFamily: 'var(--font-semi)',
                color: '#1C1C1C',
                marginBottom: 8
              }}>
                Description
              </label>
              <textarea
                className="input-glass"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: 14,
                fontFamily: 'var(--font-semi)',
                color: '#1C1C1C',
                marginBottom: 8
              }}>
                Location *
              </label>
              <input
                className="input-glass"
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 14,
                  fontFamily: 'var(--font-semi)',
                  color: '#1C1C1C',
                  marginBottom: 8
                }}>
                  Category *
                </label>
                <input
                  className="input-glass"
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  style={{ width: '100%' }}
                  placeholder="e.g., wellness, sports"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 14,
                  fontFamily: 'var(--font-semi)',
                  color: '#1C1C1C',
                  marginBottom: 8
                }}>
                  Time Slot *
                </label>
                <input
                  className="input-glass"
                  type="text"
                  value={formData.timeSlot}
                  onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                  required
                  style={{ width: '100%' }}
                  placeholder="e.g., morning, afternoon"
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: 14,
                fontFamily: 'var(--font-semi)',
                color: '#1C1C1C',
                marginBottom: 8
              }}>
                Scheduled Time (ISO format)
              </label>
              <input
                className="input-glass"
                type="datetime-local"
                value={formData.scheduledTime ? new Date(formData.scheduledTime).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 14,
                  fontFamily: 'var(--font-semi)',
                  color: '#1C1C1C',
                  marginBottom: 8
                }}>
                  Max Attendees
                </label>
                <input
                  className="input-glass"
                  type="number"
                  value={formData.maxAttendees}
                  onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
                  min="1"
                  max="1000"
                  style={{ width: '100%' }}
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 14,
                  fontFamily: 'var(--font-semi)',
                  color: '#1C1C1C',
                  marginBottom: 8
                }}>
                  Visibility
                </label>
                <select
                  className="input-glass"
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="public">Public</option>
                  <option value="connections">Connections</option>
                  <option value="friends">Friends</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>

            <div data-user-dropdown style={{ position: 'relative' }}>
              <label style={{
                display: 'block',
                fontSize: 14,
                fontFamily: 'var(--font-semi)',
                color: '#1C1C1C',
                marginBottom: 8
              }}>
                Host *
              </label>
              <input
                className="input-glass"
                type="text"
                value={selectedUser ? `${selectedUser.name} (${selectedUser.email})` : userSearch}
                onChange={(e) => {
                  const value = e.target.value;
                  setUserSearch(value);
                  setShowUserDropdown(true);
                  // Clear host_id if user is typing (not selecting)
                  if (!selectedUser || value !== `${selectedUser.name} (${selectedUser.email})`) {
                    setFormData({ ...formData, host_id: '' });
                  }
                }}
                onFocus={() => setShowUserDropdown(true)}
                placeholder="Search for user by name or email"
                required
                style={{ width: '100%' }}
              />
              {showUserDropdown && userSearch && filteredUsers.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #D1D5DB',
                  borderRadius: 8,
                  maxHeight: 200,
                  overflow: 'auto',
                  zIndex: 1000,
                  boxShadow: 'var(--shadow-lg)',
                  marginTop: 4
                }}>
                  {filteredUsers.map(user => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setFormData({ ...formData, host_id: user.id });
                        setUserSearch(`${user.name} (${user.email})`);
                        setShowUserDropdown(false);
                      }}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #F3F4F6',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F9FAFB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                      }}
                    >
                      <div style={{ fontFamily: 'var(--font-semi)', color: '#1C1C1C', fontSize: 14 }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                        {user.email}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showUserDropdown && userSearch && filteredUsers.length === 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #D1D5DB',
                  borderRadius: 8,
                  padding: '12px 16px',
                  zIndex: 1000,
                  boxShadow: 'var(--shadow-lg)',
                  marginTop: 4,
                  color: '#6B7280',
                  fontSize: 14
                }}>
                  No users found
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 14,
                  fontFamily: 'var(--font-semi)',
                  color: '#1C1C1C',
                  marginBottom: 8
                }}>
                  Latitude
                </label>
                <input
                  className="input-glass"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 14,
                  fontFamily: 'var(--font-semi)',
                  color: '#1C1C1C',
                  marginBottom: 8
                }}>
                  Longitude
                </label>
                <input
                  className="input-glass"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: 14,
                fontFamily: 'var(--font-semi)',
                color: '#1C1C1C',
                marginBottom: 8
              }}>
                Tags (comma-separated)
              </label>
              <input
                className="input-glass"
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                style={{ width: '100%' }}
                placeholder="yoga, wellness, fitness"
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: 14,
                fontFamily: 'var(--font-semi)',
                color: '#1C1C1C',
                marginBottom: 8
              }}>
                External Link
              </label>
              <input
                className="input-glass"
                type="url"
                value={formData.externalLink}
                onChange={(e) => setFormData({ ...formData, externalLink: e.target.value })}
                style={{ width: '100%' }}
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
            <button
              type="button"
              className="btn-primary"
              onClick={onClose}
              style={{
                background: 'rgba(107, 114, 128, 0.8)'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
