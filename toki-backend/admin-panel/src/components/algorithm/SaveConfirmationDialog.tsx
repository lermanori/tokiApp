export default function SaveConfirmationDialog({ onCancel, onConfirm, disabled }: { onCancel: () => void; onConfirm: () => void; disabled?: boolean; }) {
  return (
    <div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onCancel}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 480, padding: 24 }} onClick={(e)=>e.stopPropagation()}>
        <h3 style={{ fontFamily: 'var(--font-semi)', fontSize: 18, marginBottom: 12 }}>Save changes?</h3>
        <div style={{ color: '#666', marginBottom: 16 }}>You are about to update the algorithm weights. This affects recommendations for all users.</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn-primary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={onConfirm} disabled={disabled} style={{ background: 'linear-gradient(135deg,#10B981,#4DC4AA)' }}>Save</button>
        </div>
      </div>
    </div>
  );
}


