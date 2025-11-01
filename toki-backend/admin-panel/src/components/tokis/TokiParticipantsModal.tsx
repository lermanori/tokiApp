import { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';

interface ParticipantRow {
  user_id: string;
  status: string;
  joined_at: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  location: string | null;
}

export default function TokiParticipantsModal({ tokiId, onClose }: { tokiId: string; onClose: () => void; }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ParticipantRow[]>([]);

  useEffect(() => {
    load();
  }, [tokiId]);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await adminApi.getTokiParticipants(tokiId) as { success: boolean; data?: ParticipantRow[] };
      setRows(resp.data || []);
    } finally { setLoading(false); }
  };

  const formatDate = (iso?: string) => iso ? new Date(iso).toLocaleString() : '';

  return (
    <div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 720, padding: 24 }} onClick={(e)=>e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontFamily: 'var(--font-semi)', fontSize: 18 }}>Participants</h3>
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>

        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.6)' }}>
                  <th style={{ padding: '12px 16px' }}>Name</th>
                  <th style={{ padding: '12px 16px' }}>Email</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Joined</th>
                  <th style={{ padding: '12px 16px' }}>Location</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ padding: 24 }}>Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 24, color: '#666' }}>No participants</td></tr>
                ) : rows.map(p => (
                  <tr key={p.user_id} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: '12px 16px' }}>{p.name || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>{p.email}</td>
                    <td style={{ padding: '12px 16px' }}>{p.status}</td>
                    <td style={{ padding: '12px 16px' }}>{formatDate(p.joined_at)}</td>
                    <td style={{ padding: '12px 16px' }}>{p.location || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}



