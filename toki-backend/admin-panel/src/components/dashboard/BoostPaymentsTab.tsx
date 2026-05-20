import { useEffect, useState } from 'react';
import { CreditCard, RefreshCw, KeyRound, Ban } from 'lucide-react';
import { adminApi } from '../../services/adminApi';

interface BoostPurchaseRequestRow {
  id: string;
  tierId: string;
  tierSlug: string;
  tierName: string;
  totalHours: number;
  isSplittable: boolean;
  tokiId?: string | null;
  tokiTitle?: string | null;
  hostId: string;
  hostName: string;
  hostEmail: string;
  paymentAmount: number;
  paymentCurrency: string;
  status: 'pending_code' | 'code_issued' | 'approved' | 'expired' | 'cancelled';
  authorizationCode?: string | null;
  codeGeneratedAt?: string | null;
  codeExpiresAt?: string | null;
  codeRedeemedAt?: string | null;
  redeemedAt?: string | null;
  generatedByAdminId?: string | null;
  generatedByAdminName?: string | null;
  boostId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BoostPurchaseEvent {
  id: string;
  actorType: 'host' | 'admin' | 'system';
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  details: Record<string, any>;
  createdAt: string;
}

export default function BoostPaymentsTab() {
  const [requests, setRequests] = useState<BoostPurchaseRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_code' | 'code_issued' | 'approved' | 'expired' | 'cancelled'>('pending_code');
  const [selectedRequest, setSelectedRequest] = useState<BoostPurchaseRequestRow | null>(null);
  const [events, setEvents] = useState<BoostPurchaseEvent[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response: any = await adminApi.getBoostPurchaseRequests({ status: statusFilter, limit: 100 });
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error loading boost purchase requests:', error);
      alert('Failed to load boost purchase requests');
    } finally {
      setLoading(false);
    }
  };

  const loadRequestDetail = async (requestId: string) => {
    try {
      setDetailLoading(true);
      const response: any = await adminApi.getBoostPurchaseRequest(requestId);
      setSelectedRequest(response.data.request);
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Error loading boost purchase request detail:', error);
      alert('Failed to load request detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleGenerateCode = async (requestId: string) => {
    try {
      setBusyAction(`generate:${requestId}`);
      const response: any = await adminApi.generateBoostPurchaseCode(requestId);
      alert(`Authorization code: ${response.data.authorizationCode}`);
      await Promise.all([loadRequests(), loadRequestDetail(requestId)]);
    } catch (error) {
      console.error('Error generating boost purchase code:', error);
      alert('Failed to generate code');
    } finally {
      setBusyAction(null);
    }
  };

  const handleInvalidateCode = async (requestId: string) => {
    try {
      setBusyAction(`invalidate:${requestId}`);
      await adminApi.invalidateBoostPurchaseCode(requestId);
      await Promise.all([loadRequests(), loadRequestDetail(requestId)]);
    } catch (error) {
      console.error('Error invalidating boost purchase code:', error);
      alert('Failed to invalidate code');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <CreditCard size={24} color="var(--primary-purple)" />
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontFamily: 'var(--font-bold)', color: '#1F2937' }}>
              Boost Payment Requests
            </h2>
            <p style={{ margin: '6px 0 0', color: '#6B7280', fontSize: 14 }}>
              Manage manual code-based payment approvals for boost purchases.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 220 }}>
            <label style={labelStyle}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={selectStyle}
            >
              <option value="all">All</option>
              <option value="pending_code">Pending code</option>
              <option value="code_issued">Code issued</option>
              <option value="approved">Approved</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <button onClick={loadRequests} style={secondaryButtonStyle}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(360px, 1fr)', gap: 24 }}>
        <div style={tableCardStyle}>
          {loading ? (
            <div style={emptyStateStyle}>Loading payment requests...</div>
          ) : requests.length === 0 ? (
            <div style={emptyStateStyle}>No boost purchase requests found for this filter.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={tableHeaderStyle}>Host</th>
                  <th style={tableHeaderStyle}>Tier</th>
                  <th style={tableHeaderStyle}>Toki</th>
                  <th style={tableHeaderStyle}>Status</th>
                  <th style={tableHeaderStyle}>Code</th>
                  <th style={tableHeaderStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={tableCellStyle}>
                      <div style={{ fontFamily: 'var(--font-medium)', color: '#111827' }}>{request.hostName}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{request.hostEmail}</div>
                    </td>
                    <td style={tableCellStyle}>
                      <div style={{ fontFamily: 'var(--font-medium)', color: '#111827' }}>{request.tierName}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>
                        {request.paymentCurrency} {request.paymentAmount}
                      </div>
                    </td>
                    <td style={tableCellStyle}>{request.tokiTitle || 'Pro Pack / Not assigned yet'}</td>
                    <td style={tableCellStyle}>
                      <StatusPill status={request.status} />
                    </td>
                    <td style={tableCellStyle}>{request.authorizationCode || 'No code yet'}</td>
                    <td style={tableCellStyle}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button style={miniButtonStyle} onClick={() => loadRequestDetail(request.id)}>
                          View
                        </button>
                        <button
                          style={miniPrimaryButtonStyle}
                          onClick={() => handleGenerateCode(request.id)}
                          disabled={busyAction === `generate:${request.id}` || request.status === 'approved' || request.status === 'cancelled'}
                        >
                          {busyAction === `generate:${request.id}` ? 'Generating...' : 'Generate code'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={tableCardStyle}>
          {!selectedRequest ? (
            <div style={emptyStateStyle}>Select a request to inspect its code and audit history.</div>
          ) : detailLoading ? (
            <div style={emptyStateStyle}>Loading request detail...</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12, marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontFamily: 'var(--font-bold)', color: '#111827' }}>
                    {selectedRequest.tierName}
                  </h3>
                  <p style={{ margin: '6px 0 0', color: '#6B7280', fontSize: 14 }}>
                    {selectedRequest.tokiTitle || 'Pro Pack / Not assigned yet'}
                  </p>
                </div>
                <StatusPill status={selectedRequest.status} />
              </div>

              <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
                <DetailRow label="Host" value={`${selectedRequest.hostName} (${selectedRequest.hostEmail})`} />
                <DetailRow label="Amount" value={`${selectedRequest.paymentCurrency} ${selectedRequest.paymentAmount}`} />
                <DetailRow label="Authorization code" value={selectedRequest.authorizationCode || 'Not generated'} />
                <DetailRow label="Code expires" value={selectedRequest.codeExpiresAt ? new Date(selectedRequest.codeExpiresAt).toLocaleString() : 'N/A'} />
                <DetailRow label="Generated by" value={selectedRequest.generatedByAdminName || 'N/A'} />
                <DetailRow label="Approved boost" value={selectedRequest.boostId || 'Not approved yet'} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <button
                  style={primaryButtonStyle}
                  onClick={() => handleGenerateCode(selectedRequest.id)}
                  disabled={busyAction === `generate:${selectedRequest.id}` || selectedRequest.status === 'approved' || selectedRequest.status === 'cancelled'}
                >
                  <KeyRound size={16} />
                  {busyAction === `generate:${selectedRequest.id}` ? 'Generating...' : 'Generate / replace code'}
                </button>
                <button
                  style={secondaryButtonStyle}
                  onClick={() => handleInvalidateCode(selectedRequest.id)}
                  disabled={busyAction === `invalidate:${selectedRequest.id}` || !selectedRequest.authorizationCode || selectedRequest.status === 'approved'}
                >
                  <Ban size={16} />
                  {busyAction === `invalidate:${selectedRequest.id}` ? 'Invalidating...' : 'Invalidate code'}
                </button>
              </div>

              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: 16, fontFamily: 'var(--font-semi)', color: '#111827' }}>
                  Audit history
                </h4>
                {events.length === 0 ? (
                  <div style={{ color: '#6B7280', fontSize: 14 }}>No events recorded yet.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {events.map((event) => (
                      <div key={event.id} style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, background: '#F9FAFB' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <strong style={{ color: '#111827', fontFamily: 'var(--font-semi)' }}>{event.action}</strong>
                          <span style={{ color: '#6B7280', fontSize: 12 }}>{new Date(event.createdAt).toLocaleString()}</span>
                        </div>
                        <div style={{ color: '#6B7280', fontSize: 13, marginTop: 4 }}>
                          {event.actorName || event.actorType}
                        </div>
                        {event.details && Object.keys(event.details).length > 0 ? (
                          <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', fontSize: 12, color: '#374151' }}>
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: BoostPurchaseRequestRow['status'] }) {
  const colorMap: Record<BoostPurchaseRequestRow['status'], { bg: string; fg: string }> = {
    pending_code: { bg: '#FEF3C7', fg: '#92400E' },
    code_issued: { bg: '#DBEAFE', fg: '#1D4ED8' },
    approved: { bg: '#DCFCE7', fg: '#166534' },
    expired: { bg: '#FEE2E2', fg: '#991B1B' },
    cancelled: { bg: '#E5E7EB', fg: '#374151' },
  };

  const palette = colorMap[status];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 10px',
        borderRadius: 999,
        background: palette.bg,
        color: palette.fg,
        fontSize: 12,
        fontFamily: 'var(--font-semi)',
        textTransform: 'uppercase',
      }}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: '#6B7280', fontSize: 14 }}>{label}</span>
      <span style={{ color: '#111827', fontSize: 14, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--gradient-card)',
  backdropFilter: 'var(--glass-blur)',
  borderRadius: 'var(--border-radius-lg)',
  padding: '24px',
  marginBottom: '24px',
  border: '1px solid var(--glass-border)',
};

const tableCardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: 'var(--border-radius-lg)',
  border: '1px solid var(--glass-border)',
  overflow: 'hidden',
  padding: '20px',
};

const emptyStateStyle: React.CSSProperties = {
  color: '#6B7280',
  fontSize: '15px',
  textAlign: 'center',
  padding: '40px 16px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontFamily: 'var(--font-medium)',
  color: '#374151',
  marginBottom: '8px',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  border: '1px solid #D1D5DB',
  borderRadius: 'var(--border-radius-md)',
  fontSize: '14px',
  fontFamily: 'var(--font-regular)',
  cursor: 'pointer',
};

const tableHeaderStyle: React.CSSProperties = {
  padding: '12px 14px',
  textAlign: 'left',
  fontSize: '12px',
  fontFamily: 'var(--font-semi)',
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const tableCellStyle: React.CSSProperties = {
  padding: '14px',
  verticalAlign: 'top',
  fontSize: '14px',
  color: '#374151',
};

const primaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 16px',
  background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)',
  border: 'none',
  borderRadius: 'var(--border-radius-md)',
  color: 'white',
  fontFamily: 'var(--font-medium)',
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 16px',
  background: '#F9FAFB',
  border: '1px solid #D1D5DB',
  borderRadius: 'var(--border-radius-md)',
  color: '#374151',
  fontFamily: 'var(--font-medium)',
  cursor: 'pointer',
};

const miniButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 'var(--border-radius-md)',
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  color: '#374151',
  fontFamily: 'var(--font-medium)',
  cursor: 'pointer',
};

const miniPrimaryButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 'var(--border-radius-md)',
  border: 'none',
  background: '#8B5CF6',
  color: '#FFFFFF',
  fontFamily: 'var(--font-medium)',
  cursor: 'pointer',
};
