import { useState } from 'react';
import { adminApi } from '../../services/adminApi';

interface Props {
  userId: string;
  userName: string;
  userEmail: string;
  currentCredits: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InvitationCreditsModal({
  userId,
  userName,
  userEmail,
  currentCredits,
  onClose,
  onSuccess
}: Props) {
  const [credits, setCredits] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!credits || credits <= 0) {
      setError('Please enter a valid number of credits (greater than 0)');
      return;
    }

    if (credits > 1000) {
      setError('Maximum 1000 credits can be added at once');
      return;
    }

    setLoading(true);
    try {
      await adminApi.addInvitationCredits(userId, credits);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add invitation credits');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.9))',
          borderRadius: 16,
          padding: 24,
          maxWidth: 500,
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(20px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            margin: '0 0 8px 0',
            fontSize: 24,
            fontFamily: 'var(--font-bold)',
            color: '#1C1C1C',
            background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Add Invitation Credits
        </h2>
        <p style={{ margin: '0 0 24px 0', color: '#6B7280', fontSize: 14 }}>
          Add invitation credits to {userName} ({userEmail})
        </p>

        <div style={{ marginBottom: 24, padding: 16, background: 'rgba(139, 92, 246, 0.1)', borderRadius: 12 }}>
          <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 4 }}>Current Credits</div>
          <div style={{ fontSize: 32, fontFamily: 'var(--font-bold)', color: '#8B5CF6' }}>
            {currentCredits || 0}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                marginBottom: 8,
                fontSize: 14,
                fontFamily: 'var(--font-semi)',
                color: '#374151'
              }}
            >
              Credits to Add
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={credits}
              onChange={(e) => setCredits(parseInt(e.target.value) || 1)}
              className="input-glass"
              style={{ width: '100%', fontSize: 16 }}
              placeholder="Enter number of credits"
              disabled={loading}
              autoFocus
            />
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
              Enter the number of invitation credits to add to this user
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: 12,
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 8,
                color: '#EF4444',
                fontSize: 14,
                marginBottom: 20
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-primary"
              style={{
                background: 'rgba(0,0,0,0.1)',
                color: '#1C1C1C'
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                color: 'white'
              }}
              disabled={loading}
            >
              {loading ? 'Adding...' : `Add ${credits} Credit${credits !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

