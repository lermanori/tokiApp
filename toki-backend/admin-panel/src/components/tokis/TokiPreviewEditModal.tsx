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
    isPaid: toki.isPaid !== undefined ? toki.isPaid : false,
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
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Load initial users and the current host on mount
  useEffect(() => {
    const init = async () => {
      try {
        setLoadingUsers(true);
        const [usersRes, hostRes] = await Promise.all([
          adminApi.getUsers({ limit: 50 }) as any,
          toki.host_id ? adminApi.getUser(toki.host_id) as any : Promise.resolve(null)
        ]);

        const loadedUsers = usersRes.data?.users || [];
        setUsers(loadedUsers);

        if (hostRes?.success && hostRes.data) {
          const host = hostRes.data;
          console.debug('Found host info in TokiPreviewEditModal:', host.name);
          // Ensure host is in the users list for find() to work, or we can just use hostRes directly
          if (!loadedUsers.find((u: any) => u.id === host.id)) {
            setUsers(prev => [host, ...prev]);
          }
          setUserSearch(`${host.name} (${host.email})`);
        } else if (toki.host_id) {
          console.warn('Could not find host info for ID in TokiPreviewEditModal:', toki.host_id);
        }
      } catch (err) {
        console.error('Failed to initialize users:', err);
      } finally {
        setLoadingUsers(false);
      }
    };
    init();
  }, [toki.host_id]);

  // Handle server-side search with debounce
  useEffect(() => {
    if (!userSearch || userSearch.includes('(')) return; // Don't search if empty or if it looks like a selected user string

    const timer = setTimeout(async () => {
      try {
        setLoadingUsers(true);
        const response = await adminApi.getUsers({ search: userSearch, limit: 20 }) as any;
        setUsers(response.data?.users || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoadingUsers(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [userSearch]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Split categories by comma
    const categoryList = formData.category.split(',').map((c: string) => c.trim().toLowerCase()).filter(Boolean);
    const primaryCategory = categoryList[0] || '';

    // Existing tags from tags input
    const inputTags = formData.tags ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

    // Combined tags (all categories + input tags)
    const combinedTags = [...new Set([...categoryList, ...inputTags])];

    const updated = {
      ...toki,
      ...formData,
      category: primaryCategory,
      tags: combinedTags,
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
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                  {formData.category.split(',').map((c: string) => c.trim().toLowerCase()).filter(Boolean).map((cat: string, i: number) => (
                    <span key={i} style={{
                      padding: '2px 8px',
                      borderRadius: 9999,
                      background: 'linear-gradient(135deg,#8B5CF6,#EC4899)',
                      color: 'white',
                      fontSize: 11,
                      fontFamily: 'var(--font-semi)',
                      whiteSpace: 'nowrap'
                    }}>
                      {cat}
                    </span>
                  ))}
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

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 14,
                  fontFamily: 'var(--font-semi)',
                  color: '#1C1C1C',
                  marginBottom: 8
                }}>
                  Pricing
                </label>
                <select
                  className="input-glass"
                  value={formData.isPaid ? 'paid' : 'free'}
                  onChange={(e) => setFormData({ ...formData, isPaid: e.target.value === 'paid' })}
                  style={{ width: '100%' }}
                >
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
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
                placeholder="Host (Search by name or email)"
                value={selectedUser ? `${selectedUser.name} (${selectedUser.email})` : userSearch}
                onChange={(e) => {
                  const value = e.target.value;
                  setUserSearch(value);
                  setShowUserDropdown(true);
                  if (selectedUser && value !== `${selectedUser.name} (${selectedUser.email})`) {
                    setFormData({ ...formData, host_id: '' });
                  }
                }}
                onFocus={() => setShowUserDropdown(true)}
                required
                style={{ width: '100%' }}
              />
              {showUserDropdown && (userSearch || loadingUsers) && (
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
                  {loadingUsers ? (
                    <div style={{ padding: '12px 16px', color: '#6B7280', fontSize: 14 }}>Searching...</div>
                  ) : users.length > 0 ? (
                    users.map(user => (
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
                          transition: 'background 0.2s',
                          background: user.id === formData.host_id ? '#F3F4F6' : 'white'
                        }}
                        onMouseEnter={(e) => {
                          if (user.id !== formData.host_id) e.currentTarget.style.background = '#F9FAFB';
                        }}
                        onMouseLeave={(e) => {
                          if (user.id !== formData.host_id) e.currentTarget.style.background = 'white';
                        }}
                      >
                        <div style={{ fontFamily: 'var(--font-semi)', color: '#1C1C1C', fontSize: 14 }}>
                          {user.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                          {user.email}
                        </div>
                      </div>
                    ))
                  ) : userSearch ? (
                    <div style={{ padding: '12px 16px', color: '#6B7280', fontSize: 14 }}>No users found</div>
                  ) : null}
                </div>
              )}
            </div>

            <div>
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
                    min="-90"
                    max="90"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    style={{ width: '100%' }}
                    placeholder="-90 to 90"
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
                    min="-180"
                    max="180"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    style={{ width: '100%' }}
                    placeholder="-180 to 180"
                  />
                </div>
              </div>
              {(!formData.latitude || !formData.longitude) && (
                <div style={{
                  marginTop: 8,
                  padding: 8,
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#F59E0B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <span>⚠</span>
                  <span>Coordinates are recommended for the toki to appear on the map</span>
                </div>
              )}
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
