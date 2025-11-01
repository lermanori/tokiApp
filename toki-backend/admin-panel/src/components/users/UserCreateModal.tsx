import { useState } from 'react';
import { adminApi } from '../../services/adminApi';

export default function UserCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void; }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user'|'admin'>('user');
  const [verified, setVerified] = useState(false);
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const createUser = async () => {
    setSaving(true); setError('');
    try {
      await adminApi.createUser({ name, email, password: password || undefined, role, verified, location: location || null });
      onCreated();
    } catch (e: any) {
      setError(e?.message || 'Failed to create user');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 560, padding: 24 }} onClick={(e)=>e.stopPropagation()}>
        <h3 style={{ fontFamily: 'var(--font-semi)', fontSize: 18, marginBottom: 12 }}>Create User</h3>
        {error && <div style={{ color: '#EF4444', marginBottom: 12, fontSize: 14 }}>{error}</div>}
        <div style={{ display: 'grid', gap: 12 }}>
          <input className="input-glass" placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} />
          <input className="input-glass" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <input className="input-glass" placeholder="Password (optional)" value={password} onChange={(e)=>setPassword(e.target.value)} />
          <input className="input-glass" placeholder="Location (optional)" value={location} onChange={(e)=>setLocation(e.target.value)} />
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
          <button className="btn-primary" onClick={createUser} disabled={saving}>{saving ? 'Creating...' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}



