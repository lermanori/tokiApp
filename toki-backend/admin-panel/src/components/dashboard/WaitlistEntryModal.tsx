import { useState } from 'react';
import { adminApi } from '../../services/adminApi';

interface WaitlistEntry {
  id: string;
  email: string;
  phone: string | null;
  location: string | null;
  reason: string | null;
  platform: string | null;
  created_at: string;
}

interface Props {
  entry: WaitlistEntry;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WaitlistEntryModal({ entry, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<'view' | 'create' | 'email'>('view');
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [name, setName] = useState(entry.email.split('@')[0]);
  const [password, setPassword] = useState('');
  const [sendWelcome, setSendWelcome] = useState(true);
  const [sendWelcomeLink, setSendWelcomeLink] = useState(false);
  const [subject, setSubject] = useState("You're in. 🖤");
  const [body, setBody] = useState(`Hey,\n\nYou're officially on the waitlist for Toki.\nWe'll let you know the moment you can drop in.\n\n—\nToki`);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '');

  const handleCreateUser = async () => {
    setError('');
    setSuccess('');
    setCreating(true);
    try {
      await adminApi.createUserFromWaitlist(entry.id, {
        name,
        password: password || undefined,
        sendWelcomeEmail: sendWelcome && !sendWelcomeLink,
        sendWelcomeLink: sendWelcomeLink === true
      });
      setSuccess('User created successfully');
      onSuccess();
    } catch (e: any) {
      setError(e?.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleSendEmail = async () => {
    setError('');
    setSuccess('');
    setSending(true);
    try {
      await adminApi.sendEmailToWaitlist(entry.id, { subject, body });
      setSuccess('Email sent');
      onSuccess();
    } catch (e: any) {
      setError(e?.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 720, padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontFamily: 'var(--font-semi)', fontSize: 18 }}>Waitlist Entry</h3>
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <TabButton active={tab === 'view'} onClick={() => setTab('view')} label="Details" />
          <TabButton active={tab === 'create'} onClick={() => setTab('create')} label="Create User" />
          <TabButton active={tab === 'email'} onClick={() => setTab('email')} label="Send Email" />
        </div>

        {error && <div style={{ marginBottom: 12, color: '#EF4444', fontSize: 14 }}>{error}</div>}
        {success && <div style={{ marginBottom: 12, color: '#10B981', fontSize: 14 }}>{success}</div>}

        {tab === 'view' && (
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 8, columnGap: 12 }}>
            <div style={{ color: '#666' }}>Email</div><div>{entry.email}</div>
            <div style={{ color: '#666' }}>Location</div><div>{entry.location || '-'}</div>
            <div style={{ color: '#666' }}>Platform</div><div>{entry.platform || '-'}</div>
            <div style={{ color: '#666' }}>Phone</div><div>{entry.phone || '-'}</div>
            <div style={{ color: '#666' }}>Reason</div><div>{entry.reason || '-'}</div>
            <div style={{ color: '#666' }}>Created</div><div>{formatDate(entry.created_at)}</div>
          </div>
        )}

        {tab === 'create' && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <div style={{ color: '#666', fontSize: 14, marginBottom: 6 }}>Name</div>
              <input className="input-glass" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <div style={{ color: '#666', fontSize: 14, marginBottom: 6 }}>Password (optional)</div>
              <input className="input-glass" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave empty to auto-generate" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#333' }}>
              <input type="checkbox" checked={sendWelcome} onChange={(e) => setSendWelcome(e.target.checked)} />
              Send welcome email
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#333' }}>
              <input
                type="checkbox"
                checked={sendWelcomeLink}
                onChange={(e) => setSendWelcomeLink(e.target.checked)}
              />
              Send welcome password link (user will set password)
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={handleCreateUser} disabled={creating}>
                {creating ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        )}

        {tab === 'email' && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <div style={{ color: '#666', fontSize: 14, marginBottom: 6 }}>Subject</div>
              <input className="input-glass" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <div style={{ color: '#666', fontSize: 14, marginBottom: 6 }}>Body</div>
              <textarea className="input-glass" value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={handleSendEmail} disabled={sending}>
                {sending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string; }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        border: 'none',
        background: active ? 'rgba(139,92,246,0.12)' : 'transparent',
        borderBottom: active ? '2px solid var(--primary-purple)' : '2px solid transparent',
        color: active ? 'var(--primary-purple)' : '#666',
        cursor: 'pointer',
        borderRadius: 8
      }}
    >
      {label}
    </button>
  );
}

