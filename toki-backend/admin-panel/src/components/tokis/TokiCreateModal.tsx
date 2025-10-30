import { useState } from 'react';
import { adminApi } from '../../services/adminApi';

export default function TokiCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void; }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('draft');
  const [location, setLocation] = useState('');
  const [hostId, setHostId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const createToki = async () => {
    setSaving(true); setError('');
    try {
      await adminApi.createToki({ title, description, category, status, location, host_id: hostId });
      onCreated();
    } catch (e: any) {
      setError(e?.message || 'Failed to create toki');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 600, padding: 24 }} onClick={(e)=>e.stopPropagation()}>
        <h3 style={{ fontFamily: 'var(--font-semi)', fontSize: 18, marginBottom: 12 }}>Create Toki</h3>
        {error && <div style={{ color: '#EF4444', marginBottom: 12, fontSize: 14 }}>{error}</div>}
        <div style={{ display: 'grid', gap: 12 }}>
          <input className="input-glass" placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} />
          <textarea className="input-glass" placeholder="Description" value={description} onChange={(e)=>setDescription(e.target.value)} rows={5} />
          <input className="input-glass" placeholder="Category" value={category} onChange={(e)=>setCategory(e.target.value)} />
          <input className="input-glass" placeholder="Status" value={status} onChange={(e)=>setStatus(e.target.value)} />
          <input className="input-glass" placeholder="Location" value={location} onChange={(e)=>setLocation(e.target.value)} />
          <input className="input-glass" placeholder="Host ID" value={hostId} onChange={(e)=>setHostId(e.target.value)} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
          <button className="btn-primary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={createToki} disabled={saving}>{saving ? 'Creating...' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}


