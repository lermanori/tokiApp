import { useState, useEffect } from 'react';
import { adminApi } from '../../services/adminApi';

export default function TokiCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void; }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    status: 'draft',
    location: '',
    host_id: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Load initial users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await adminApi.getUsers({ limit: 50 }) as any;
        setUsers(response.data?.users || []);
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);

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

  const createToki = async () => {
    setSaving(true);
    setError('');
    try {
      await adminApi.createToki(formData);
      onCreated();
    } catch (e: any) {
      setError(e?.message || 'Failed to create toki');
    } finally {
      setSaving(false);
    }
  };

  const selectedUser = users.find(u => u.id === formData.host_id);

  return (
    <div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }} onClick={onClose}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 600, padding: 24, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontFamily: 'var(--font-semi)', fontSize: 18, marginBottom: 12 }}>Create Toki</h3>
        {error && <div style={{ color: '#EF4444', marginBottom: 12, fontSize: 14 }}>{error}</div>}

        <div style={{ display: 'grid', gap: 12 }}>
          <input className="input-glass" placeholder="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          <textarea className="input-glass" placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={5} />
          <input className="input-glass" placeholder="Category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
          <input className="input-glass" placeholder="Status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} />
          <input className="input-glass" placeholder="Location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />

          {/* Host search */}
          <div data-user-dropdown style={{ position: 'relative' }}>
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
              style={{ width: '100%', borderColor: !formData.host_id ? '#EF4444' : undefined }}
            />
            {showUserDropdown && (userSearch || loadingUsers) && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: 'white', border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: 8, marginTop: 4, zIndex: 10,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxHeight: 150, overflowY: 'auto'
              }}>
                {loadingUsers ? (
                  <div style={{ padding: '12px 16px', color: '#666', fontSize: 14 }}>Searching...</div>
                ) : users.length > 0 ? (
                  users.map(u => (
                    <div
                      key={u.id}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        background: u.id === formData.host_id ? 'rgba(0,0,0,0.02)' : 'transparent'
                      }}
                      onClick={() => {
                        setFormData({ ...formData, host_id: u.id });
                        setUserSearch(`${u.name} (${u.email})`);
                        setShowUserDropdown(false);
                      }}
                    >
                      <div style={{ fontSize: 14, fontFamily: 'var(--font-semi)', color: '#1C1C1C' }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{u.email}</div>
                    </div>
                  ))
                ) : userSearch ? (
                  <div style={{ padding: '10px 12px', color: '#666', fontSize: 14 }}>No users found</div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
          <button className="btn-primary" onClick={onClose} style={{ background: 'rgba(107, 114, 128, 0.8)' }}>Cancel</button>
          <button
            className="btn-primary"
            onClick={createToki}
            disabled={saving || !formData.title || !formData.host_id}
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}



