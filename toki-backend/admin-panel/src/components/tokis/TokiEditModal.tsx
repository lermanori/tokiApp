import { useState } from 'react';
import { adminApi } from '../../services/adminApi';

interface TokiRow { id: string; title: string; description?: string; category: string | null; status: string | null; location: string | null; host_id: string; }

export default function TokiEditModal({ toki, onClose, onSaved }: { toki: TokiRow; onClose: () => void; onSaved: () => void; }) {
  const [title, setTitle] = useState(toki.title);
  const [description, setDescription] = useState(toki.description || '');
  const [category, setCategory] = useState(toki.category || '');
  const [status, setStatus] = useState(toki.status || '');
  const [location, setLocation] = useState(toki.location || '');
  const [hostId, setHostId] = useState(toki.host_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true); setError('');
    try {
      await adminApi.updateToki(toki.id, { title, description, category, status, location, host_id: hostId });
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Failed to save toki');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 600, padding: 24 }} onClick={(e)=>e.stopPropagation()}>
        <h3 style={{ fontFamily: 'var(--font-semi)', fontSize: 18, marginBottom: 12 }}>Edit Toki</h3>
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
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}



