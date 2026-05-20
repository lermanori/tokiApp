import { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';

type Flag = {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

export default function FeatureFlagsTab() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await adminApi.getFeatureFlags();
      setFlags(resp?.data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onToggle = async (flag: Flag, next: boolean) => {
    const confirmMsg = next
      ? `Enable "${flag.key}" globally? This affects all clients within ~60s (server cache TTL).`
      : `Disable "${flag.key}" globally? This affects all clients within ~60s (server cache TTL).`;
    if (!window.confirm(confirmMsg)) return;

    setPending((p) => ({ ...p, [flag.key]: true }));
    setError(null);
    try {
      await adminApi.setFeatureFlag(flag.key, next);
      await load();
    } catch (e: any) {
      setError(e?.message || `Failed to update ${flag.key}`);
    } finally {
      setPending((p) => {
        const copy = { ...p };
        delete copy[flag.key];
        return copy;
      });
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>
      <h2 style={{ fontFamily: 'var(--font-semi)', fontSize: 20 }}>Feature Flags</h2>
      <p style={{ color: '#666', fontSize: 14, margin: 0 }}>
        Server-side flags. Changes propagate to all clients within ~60 seconds (server cache TTL).
        Affects production immediately if this admin panel is pointed at the production backend.
      </p>

      {loading && <div style={{ color: '#666' }}>Loading…</div>}
      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--border-radius-md)',
            padding: '12px 16px',
            color: '#B91C1C',
          }}
        >
          {error}
        </div>
      )}

      {!loading && flags.length === 0 && !error && (
        <div style={{ color: '#666' }}>No feature flags defined.</div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {flags.map((flag) => {
          const isPending = !!pending[flag.key];
          return (
            <div
              key={flag.key}
              style={{
                background: 'var(--gradient-card)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--border-radius-lg)',
                padding: 20,
                boxShadow: 'var(--shadow-sm)',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 16,
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <code
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: 15,
                      background: 'rgba(0,0,0,0.04)',
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {flag.key}
                  </code>
                  <span
                    style={{
                      fontSize: 12,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: flag.enabled
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(107, 114, 128, 0.12)',
                      color: flag.enabled ? '#047857' : '#374151',
                      fontFamily: 'var(--font-medium)',
                    }}
                  >
                    {flag.enabled ? 'enabled' : 'disabled'}
                  </span>
                </div>
                {flag.description && (
                  <div style={{ color: '#374151', fontSize: 14, marginBottom: 4 }}>
                    {flag.description}
                  </div>
                )}
                <div style={{ color: '#6B7280', fontSize: 12 }}>
                  Updated {new Date(flag.updatedAt).toLocaleString()}
                  {flag.updatedBy ? ` by ${flag.updatedBy}` : ''}
                </div>
              </div>

              <button
                onClick={() => onToggle(flag, !flag.enabled)}
                disabled={isPending}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid var(--glass-border)',
                  background: flag.enabled
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(16, 185, 129, 0.12)',
                  color: flag.enabled ? '#B91C1C' : '#047857',
                  fontFamily: 'var(--font-medium)',
                  cursor: isPending ? 'wait' : 'pointer',
                  opacity: isPending ? 0.6 : 1,
                  minWidth: 110,
                }}
              >
                {isPending ? 'Saving…' : flag.enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
