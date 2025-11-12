import { useState } from 'react';
import { adminApi } from '../../services/adminApi';

type Entry = {
  id?: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  platform?: string | null;
};

export default function WaitlistEditModal({
  initial,
  onClose,
  onSaved
}: {
  initial?: Entry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState(initial?.email || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [location, setLocation] = useState(initial?.location || '');
  const [platform, setPlatform] = useState(initial?.platform || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    if (!email) {
      setError('Email is required');
      return;
    }
    setSaving(true);
    try {
      if (initial?.id) {
        await adminApi.updateWaitlistEntry(initial.id, {
          email,
          phone: phone || null,
          location: location || null,
          platform: platform || null
        });
      } else {
        await adminApi.createWaitlistEntry({
          email,
          phone: phone || null,
          location: location || null,
          platform: platform || null
        });
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 640, padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontFamily: 'var(--font-semi)', fontSize: 18 }}>{initial?.id ? 'Edit Waitlist Entry' : 'New Waitlist Entry'}</h3>
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>

        {error && <div style={{ marginBottom: 12, color: '#EF4444', fontSize: 14 }}>{error}</div>}

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <div style={{ color: '#666', fontSize: 14, marginBottom: 6 }}>Email</div>
            <input className="input-glass" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div style={{ color: '#666', fontSize: 14, marginBottom: 6 }}>Location</div>
            <input className="input-glass" value={location || ''} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <div style={{ color: '#666', fontSize: 14, marginBottom: 6 }}>Platform</div>
            <select className="input-glass" value={platform || ''} onChange={(e) => setPlatform(e.target.value)}>
              <option value="">—</option>
              <option value="ios">iOS</option>
              <option value="android">Android</option>
              <option value="web">Web</option>
            </select>
          </div>
          <div>
            <div style={{ color: '#666', fontSize: 14, marginBottom: 6 }}>Phone</div>
            <input className="input-glass" value={phone || ''} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving...' : (initial?.id ? 'Save Changes' : 'Create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



