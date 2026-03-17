import { useState, useEffect } from 'react';
import { adminApi } from '../../services/adminApi';

interface TokiRow { id: string; title: string; description?: string; category: string | null; status: string | null; location: string | null; host_id: string; }

export default function TokiEditModal({ toki, onClose, onSaved }: { toki: TokiRow; onClose: () => void; onSaved: () => void; }) {
  const [formData, setFormData] = useState({
    title: toki.title || '',
    description: toki.description || '',
    location: toki.location || '',
    category: toki.category || '',
    timeSlot: '',
    isPaid: false,
    scheduledTime: '',
    maxAttendees: '',
    visibility: 'public',
    tags: '',
    host_id: toki.host_id || '',
    latitude: '',
    longitude: '',
    externalLink: '',
    status: toki.status || 'draft',
    autoApprove: false
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Load detailed Toki data and users
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [tokiRes, usersRes] = await Promise.all([
          adminApi.getToki(toki.id) as any,
          adminApi.getUsers({ limit: 50 }) as any
        ]);

        const fullToki = tokiRes.data;
        console.debug('Loaded full Toki:', fullToki.id, 'Host ID:', fullToki.host_id);

        setFormData({
          title: fullToki.title || '',
          description: fullToki.description || '',
          location: fullToki.location || '',
          category: fullToki.category || '',
          timeSlot: fullToki.time_slot || '',
          isPaid: fullToki.is_paid || false,
          scheduledTime: fullToki.scheduled_time ? new Date(fullToki.scheduled_time).toISOString().slice(0, 16) : '',
          maxAttendees: fullToki.max_attendees ? String(fullToki.max_attendees) : '',
          visibility: fullToki.visibility || 'public',
          tags: Array.isArray(fullToki.tags) ? fullToki.tags.join(', ') : '',
          host_id: fullToki.host_id || '',
          latitude: fullToki.latitude ? String(fullToki.latitude) : '',
          longitude: fullToki.longitude ? String(fullToki.longitude) : '',
          externalLink: fullToki.external_link || '',
          status: fullToki.status || 'draft',
          autoApprove: fullToki.auto_approve || false
        });

        const loadedUsers = usersRes.data?.users || [];
        setUsers(loadedUsers);

        if (fullToki.host_id) {
          console.debug('Looking for host info for ID:', fullToki.host_id);
          // Check if host is in loaded users, if not, fetch them explicitly
          let host = loadedUsers.find((u: any) => u.id === fullToki.host_id);
          if (!host) {
            console.debug('Host not in initial list, fetching from server...');
            try {
              const hostRes = await adminApi.getUser(fullToki.host_id) as any;
              console.debug('Host fetch response:', hostRes);
              if (hostRes?.success && hostRes.data) {
                host = hostRes.data;
                setUsers(prev => [host, ...prev]);
              }
            } catch (err) {
              console.error('Failed to load host user:', err);
            }
          }

          if (host) {
            console.debug('Found host info, setting search text:', host.name);
            setUserSearch(`${host.name} (${host.email})`);
          } else {
            console.warn('Could not find host info for ID:', fullToki.host_id);
          }
        }
      } catch (err: any) {
        console.error('Failed to load toki details:', err);
        setError('Failed to load Toki details');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [toki.id]);

  // Handle server-side search with debounce
  useEffect(() => {
    if (!userSearch || userSearch.includes('(')) return;

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

  // Click outside handler for dropdown
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

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    // Map state to payload
    // Split categories by comma
    const categoryList = formData.category.split(',').map((c: string) => c.trim().toLowerCase()).filter(Boolean);
    const primaryCategory = categoryList[0] || '';

    // Combined tags (all categories + any extra tags provided)
    const extraTags = formData.tags ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
    const combinedTags = [...new Set([...categoryList, ...extraTags])];

    const payload = {
      title: formData.title,
      description: formData.description,
      location: formData.location,
      category: primaryCategory,
      time_slot: formData.timeSlot,
      status: formData.status,
      is_paid: formData.isPaid,
      scheduled_time: formData.scheduledTime ? new Date(formData.scheduledTime).toISOString() : null,
      max_attendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
      visibility: formData.visibility,
      tags: combinedTags,
      host_id: formData.host_id,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      external_link: formData.externalLink,
      auto_approve: formData.autoApprove
    };

    try {
      await adminApi.updateToki(toki.id, payload);
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Failed to save toki');
    } finally {
      setSaving(false);
    }
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
          maxWidth: 800,
          background: 'rgba(255, 255, 255, 0.95)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: 24, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontFamily: 'var(--font-semi)', fontSize: 24, margin: 0 }}>
            Edit Toki
          </h2>
        </div>

        <div style={{ padding: 24, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#666' }}>Loading toki details...</div>
          ) : (
            <form id="edit-toki-form" onSubmit={save} style={{ display: 'grid', gap: 24 }}>
              {error && <div style={{ color: '#EF4444', marginBottom: 12, fontSize: 14 }}>{error}</div>}
              {/* Basic Info */}
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: 8 }}>Title *</label>
                  <input required className="input-glass" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} style={{ width: '100%' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: 8 }}>Description</label>
                  <textarea className="input-glass" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', minHeight: 100, resize: 'vertical' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: 8 }}>Category *</label>
                    <input required className="input-glass" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={{ width: '100%' }} placeholder="e.g. wellness, sports" />
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
                    <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: 8 }}>Tags (comma separated)</label>
                    <input className="input-glass" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} placeholder="e.g. music, live, outdoor" style={{ width: '100%' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: 8 }}>Status *</label>
                    <select className="input-glass" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} style={{ width: '100%' }}>
                      <option value="draft">Draft</option>
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--font-semi)', color: '#1C1C1C' }}>
                      <input
                        type="checkbox"
                        checked={formData.autoApprove}
                        onChange={e => setFormData({ ...formData, autoApprove: e.target.checked })}
                        style={{ width: 18, height: 18 }}
                      />
                      Auto-Approve Joins
                    </label>
                  </div>
                </div>
              </div>

              {/* Time & Attendance */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: 8 }}>Scheduled Time</label>
                  <input type="datetime-local" className="input-glass" value={formData.scheduledTime} onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: 8 }}>Time Slot (Morning/Afternoon/Evening)</label>
                  <input className="input-glass" value={formData.timeSlot} onChange={e => setFormData({ ...formData, timeSlot: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: 8 }}>Max Attendees</label>
                  <input type="number" min="1" className="input-glass" value={formData.maxAttendees} onChange={e => setFormData({ ...formData, maxAttendees: e.target.value })} placeholder="Leave empty for unlimited" style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: 8 }}>Visibility</label>
                    <select className="input-glass" value={formData.visibility} onChange={e => setFormData({ ...formData, visibility: e.target.value })} style={{ width: '100%' }}>
                      <option value="public">Public</option>
                      <option value="link">Link Only</option>
                      <option value="friends">Friends</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: 8 }}>Pricing</label>
                    <select className="input-glass" value={formData.isPaid ? 'paid' : 'free'} onChange={e => setFormData({ ...formData, isPaid: e.target.value === 'paid' })} style={{ width: '100%' }}>
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Host mapping UI */}
              <div data-user-dropdown style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: 8 }}>Host *</label>
                <input
                  required
                  className="input-glass"
                  placeholder="Search by name or email"
                  value={selectedUser ? `${selectedUser.name} (${selectedUser.email})` : userSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setUserSearch(value);
                    if (selectedUser && value !== `${selectedUser.name} (${selectedUser.email})`) {
                      setFormData({ ...formData, host_id: '' });
                    }
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  style={{ width: '100%', borderColor: !formData.host_id ? '#EF4444' : undefined }}
                />

                {showUserDropdown && (userSearch || loadingUsers) && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: 'white', border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: 12, marginTop: 4, zIndex: 10,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto'
                  }}>
                    {loadingUsers ? (
                      <div style={{ padding: '12px 16px', color: '#666', textAlign: 'center' }}>Searching...</div>
                    ) : users.length > 0 ? (
                      users.map(u => (
                        <div
                          key={u.id}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid rgba(0,0,0,0.05)',
                            background: u.id === formData.host_id ? 'rgba(0,0,0,0.02)' : 'transparent'
                          }}
                          onClick={() => {
                            setFormData({ ...formData, host_id: u.id });
                            setUserSearch(`${u.name} (${u.email})`);
                            setShowUserDropdown(false);
                          }}
                        >
                          <div>
                            <div style={{ fontFamily: 'var(--font-semi)', color: '#1C1C1C' }}>{u.name}</div>
                            <div style={{ fontSize: 13, color: '#666' }}>{u.email}</div>
                          </div>
                        </div>
                      ))
                    ) : userSearch ? (
                      <div style={{ padding: '12px 16px', color: '#666', textAlign: 'center' }}>No users found</div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Location */}
              <div style={{ paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.1)', display: 'grid', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: 8 }}>Location Name *</label>
                  <input required className="input-glass" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} style={{ width: '100%' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: 8 }}>Latitude</label>
                    <input type="number" step="any" className="input-glass" value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: e.target.value })} placeholder="e.g. 32.0853" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: 8 }}>Longitude</label>
                    <input type="number" step="any" className="input-glass" value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: e.target.value })} placeholder="e.g. 34.7818" style={{ width: '100%' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: 8 }}>External Link</label>
                  <input type="url" className="input-glass" value={formData.externalLink} onChange={e => setFormData({ ...formData, externalLink: e.target.value })} placeholder="https://..." style={{ width: '100%' }} />
                </div>
              </div>

            </form>
          )}
        </div>

        <div style={{
          padding: 24,
          borderTop: '1px solid rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          background: 'rgba(255,255,255,0.5)'
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary"
            style={{ background: 'rgba(0,0,0,0.05)', color: '#1C1C1C' }}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-toki-form"
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}
            disabled={saving || !formData.title || !formData.category || !formData.location || !formData.host_id}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}



