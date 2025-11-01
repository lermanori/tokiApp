import { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';

interface TemplateRow { id: string; template_name: string; subject: string; body_text: string; variables?: any; updated_at: string; }

export default function EmailTemplatesPanel({ onClose }: { onClose: () => void; }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const resp = await adminApi.getEmailTemplates() as { success: boolean; data?: TemplateRow[] };
      setRows(resp.data || []);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 960, padding: 24 }} onClick={(e)=>e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontFamily: 'var(--font-semi)', fontSize: 18 }}>Email Templates</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={()=>setCreating(true)}>New Template</button>
            <button className="btn-primary" onClick={onClose}>Close</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.6)' }}>
                <th style={{ padding: '12px 16px' }}>Name</th>
                <th style={{ padding: '12px 16px' }}>Subject</th>
                <th style={{ padding: '12px 16px' }}>Updated</th>
                <th style={{ padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: 24 }}>Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 24, color: '#666' }}>No templates</td></tr>
              ) : rows.map(t => (
                <tr key={t.id} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={{ padding: '12px 16px' }}>{t.template_name}</td>
                  <td style={{ padding: '12px 16px' }}>{t.subject}</td>
                  <td style={{ padding: '12px 16px' }}>{new Date(t.updated_at).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <button className="btn-primary" onClick={()=>setEditing(t)} style={{ marginRight: 8 }}>Edit</button>
                    <button className="btn-primary" onClick={async ()=>{ await adminApi.deleteEmailTemplate(t.id); load(); }} style={{ background: 'linear-gradient(135deg,#EF4444,#EC4899)' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(editing || creating) && (
          <TemplateEditor
            initial={editing || undefined}
            onClose={()=>{ setEditing(null); setCreating(false); }}
            onSaved={()=>{ setEditing(null); setCreating(false); load(); }}
          />
        )}
      </div>
    </div>
  );
}

function TemplateEditor({ initial, onClose, onSaved }: { initial?: TemplateRow; onClose: () => void; onSaved: () => void; }) {
  const [template_name, setName] = useState(initial?.template_name || '');
  const [subject, setSubject] = useState(initial?.subject || '');
  const [body_text, setBody] = useState(initial?.body_text || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true); setError('');
    try {
      if (initial) {
        await adminApi.updateEmailTemplate(initial.id, { template_name, subject, body_text });
      } else {
        await adminApi.createEmailTemplate({ template_name, subject, body_text });
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 720, padding: 24 }} onClick={(e)=>e.stopPropagation()}>
        <h3 style={{ fontFamily: 'var(--font-semi)', fontSize: 18, marginBottom: 12 }}>{initial ? 'Edit Template' : 'New Template'}</h3>
        {error && <div style={{ color: '#EF4444', marginBottom: 12, fontSize: 14 }}>{error}</div>}
        <div style={{ display: 'grid', gap: 12 }}>
          <input className="input-glass" placeholder="Template name" value={template_name} onChange={(e)=>setName(e.target.value)} />
          <input className="input-glass" placeholder="Subject" value={subject} onChange={(e)=>setSubject(e.target.value)} />
          <textarea className="input-glass" placeholder="Body" value={body_text} onChange={(e)=>setBody(e.target.value)} rows={12} />
          <div style={{ color: '#666', fontSize: 12 }}>Available variables: {'{position}'}, {'{city}'}, {'{name}'}, {'{email}'}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
          <button className="btn-primary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}



