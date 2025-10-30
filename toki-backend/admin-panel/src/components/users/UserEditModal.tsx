import { useState } from 'react';
import { adminApi } from '../../services/adminApi';

interface UserRow { id: string; email: string; name: string; role: 'user'|'admin'; verified: boolean; location: string | null; }

export default function UserEditModal({ user, onClose, onSaved }: { user: UserRow; onClose: () => void; onSaved: () => void; }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<UserRow['role']>(user.role);
  const [verified, setVerified] = useState<boolean>(user.verified);
  const [location, setLocation] = useState<string>(user.location || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true); setError('');
    try {
      await adminApi.updateUser(user.id, { name, email, role, verified, location: location || null });
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 560, padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontFamily: 'var(--font-semi)', fontSize: 18, marginBottom: 12 }}>Edit User</h3>
        {error && <div style={{ color: '#EF4444', marginBottom: 12, fontSize: 14 }}>{error}</div>}
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <div style={{ color: '#666', marginBottom: 6, fontSize: 14 }}>Name</div>
            <input className="input-glass" value={name} onChange={(e)=>setName(e.target.value)} />
          </div>
          <div>
            <div style={{ color: '#666', marginBottom: 6, fontSize: 14 }}>Email</div>
            <input className="input-glass" value={email} onChange={(e)=>setEmail(e.target.value)} />
          </div>
          <div>
            <div style={{ color: '#666', marginBottom: 6, fontSize: 14 }}>Location</div>
            <input className="input-glass" value={location} onChange={(e)=>setLocation(e.target.value)} />
          </div>
          <div>
            <div style={{ color: '#666', marginBottom: 6, fontSize: 14 }}>Role</div>
            <select className="input-glass" value={role} onChange={(e)=>setRole(e.target.value as any)}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={verified} onChange={(e)=>setVerified(e.target.checked)} /> Verified
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
          <button className="btn-primary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}


