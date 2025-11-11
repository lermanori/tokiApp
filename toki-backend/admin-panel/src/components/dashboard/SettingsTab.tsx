import { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';

export default function SettingsTab() {
  const [hours, setHours] = useState<number>(2);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await adminApi.getPasswordExpiry() as any;
        if (mounted) {
          setHours(resp?.data?.hours ?? 2);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load settings');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const onSave = async () => {
    try {
      setSaving(true);
      setSaved(false);
      setError(null);
      await adminApi.updatePasswordExpiry(hours);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 520 }}>
      <h2 style={{ fontFamily: 'var(--font-semi)', fontSize: 20 }}>Security Settings</h2>
      <div style={{
        background: 'var(--gradient-card)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--border-radius-lg)',
        padding: 20,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="expiry" style={{ display: 'block', marginBottom: 6, color: '#374151' }}>
            Password link expiry (hours)
          </label>
          <input
            id="expiry"
            type="number"
            min={1}
            max={168}
            value={hours}
            onChange={(e) => setHours(Math.max(1, Math.min(168, Number(e.target.value))))}
            style={{
              width: 160,
              padding: '10px 12px',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              fontFamily: 'var(--font-regular)'
            }}
            disabled={loading || saving}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onSave}
            disabled={loading || saving}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid var(--glass-border)',
              background: 'linear-gradient(135deg,#8B5CF6,#EC4899)',
              color: 'white',
              fontFamily: 'var(--font-semi)',
              cursor: loading || saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {saved && <span style={{ color: '#10B981' }}>Saved</span>}
          {error && <span style={{ color: '#EF4444' }}>{error}</span>}
        </div>
      </div>
      <p style={{ color: '#6B7280', fontSize: 14 }}>
        This controls the validity of both welcome and forgot password links. New links issued will use the updated duration.
      </p>
    </div>
  );
}


