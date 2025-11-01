export default function DeleteConfirmDialog({ title, message, confirmText = 'Delete', onCancel, onConfirm, loading }: {
  title: string;
  message: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onCancel}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 480, padding: 24 }} onClick={(e)=>e.stopPropagation()}>
        <h3 style={{ fontFamily: 'var(--font-semi)', fontSize: 18, marginBottom: 12 }}>{title}</h3>
        <div style={{ color: '#666', marginBottom: 16 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn-primary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={onConfirm} disabled={loading} style={{ background: 'linear-gradient(135deg,#EF4444,#EC4899)' }}>{loading ? 'Deleting...' : confirmText}</button>
        </div>
      </div>
    </div>
  );
}



