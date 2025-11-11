import { useState, useEffect } from 'react';
import { adminApi } from '../../services/adminApi';

interface Props {
  userId: string;
  userName: string;
  userEmail: string;
  purpose: 'welcome' | 'reset';
  onClose: () => void;
  onSuccess: () => void;
}

interface EmailTemplate {
  id: string;
  template_name: string;
  subject: string;
  body_text: string;
}

export default function PasswordLinkModal({ userId, userName, userEmail, purpose, onClose, onSuccess }: Props) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [includeLink, setIncludeLink] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState<string>('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const resp = await adminApi.getEmailTemplates() as { success: boolean; data?: EmailTemplate[] };
      setTemplates(resp.data || []);
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
  };

  const handleSend = async () => {
    setError('');
    setSending(true);
    try {
      const resp = await adminApi.issuePasswordLink(
        userId,
        purpose,
        true, // send email
        selectedTemplateId || undefined,
        includeLink
      ) as any;
      setLink(resp?.data?.link || '');
      if (resp?.data?.link) {
        navigator.clipboard?.writeText?.(resp.data.link).catch(() => {});
      }
      onSuccess();
    } catch (e: any) {
      setError(e?.message || 'Failed to send password link');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 600, padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-semi)', fontSize: 18 }}>
            Send {purpose === 'welcome' ? 'Welcome' : 'Reset'} Password Link
          </h3>
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>

        <div style={{ marginBottom: 12, color: '#666', fontSize: 14 }}>
          To: {userName} ({userEmail})
        </div>

        {error && <div style={{ marginBottom: 12, color: '#EF4444', fontSize: 14 }}>{error}</div>}
        {link && (
          <div style={{ marginBottom: 12, padding: 12, background: 'rgba(139,92,246,0.1)', borderRadius: 8 }}>
            <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>Link (copied to clipboard):</div>
            <div style={{ color: '#8B5CF6', fontSize: 12, wordBreak: 'break-all' }}>{link}</div>
          </div>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <div style={{ color: '#666', fontSize: 14, marginBottom: 6 }}>Email Template</div>
            <select
              className="input-glass"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              <option value="">Use default template</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.template_name}</option>
              ))}
            </select>
            {selectedTemplateId && (
              <div style={{ marginTop: 8, padding: 8, background: 'rgba(0,0,0,0.05)', borderRadius: 4, fontSize: 12 }}>
                {templates.find(t => t.id === selectedTemplateId)?.subject && (
                  <div><strong>Subject:</strong> {templates.find(t => t.id === selectedTemplateId)?.subject}</div>
                )}
              </div>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#333' }}>
            <input
              type="checkbox"
              checked={includeLink}
              onChange={(e) => setIncludeLink(e.target.checked)}
            />
            Include password link in email
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn-primary" onClick={onClose} disabled={sending}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSend}
              disabled={sending}
              style={{ background: 'linear-gradient(135deg,#8B5CF6,#EC4899)' }}
            >
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

