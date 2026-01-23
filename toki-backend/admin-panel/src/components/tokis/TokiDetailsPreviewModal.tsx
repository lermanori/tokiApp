interface TokiDetailsPreviewModalProps {
  toki: any;
  validation?: {
    status: 'valid' | 'invalid';
    errors?: string[];
    warnings?: string[];
  };
  onClose: () => void;
  onEdit?: () => void;
}

function formatTimeSlot(timeSlot: string): string {
  const timeSlots: Record<string, string> = {
    now: 'Now',
    '30min': '30 min',
    '1hour': '1 hour',
    '2hours': '2 hours',
    '3hours': '3 hours',
    tonight: 'Tonight',
    tomorrow: 'Tomorrow',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening'
  };
  return timeSlots[timeSlot] || timeSlot;
}

export default function TokiDetailsPreviewModal({ toki, validation, onClose, onEdit }: TokiDetailsPreviewModalProps) {
  const displayImage = toki.previewImage || toki.image || (toki.images && toki.images[0]?.url);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }} onClick={onClose}>
      <div 
        className="glass-card" 
        style={{
          width: '100%',
          maxWidth: 800,
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontFamily: 'var(--font-semi)'
          }}
        >
          ✕
        </button>

        {/* Validation Badge */}
        {validation && (
          <div style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 10,
            padding: '6px 16px',
            borderRadius: 9999,
            background: validation.status === 'valid' 
              ? 'linear-gradient(135deg,#10B981,#4DC4AA)' 
              : 'linear-gradient(135deg,#EF4444,#EC4899)',
            color: 'white',
            fontSize: 14,
            fontFamily: 'var(--font-semi)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}>
            {validation.status === 'valid' ? '✓ Valid' : '✗ Invalid'}
          </div>
        )}
        
        {/* Hero Image */}
        <div style={{
          width: '100%',
          height: 300,
          background: 'linear-gradient(135deg,#8B5CF6,#EC4899)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {displayImage ? (
            <img 
              src={displayImage} 
              alt={toki.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontSize: 64,
              opacity: 0.5
            }}>
              📅
            </div>
          )}
        </div>
        
        {/* Content */}
        <div style={{ padding: 24 }}>
          <h1 style={{
            fontSize: 28,
            fontFamily: 'var(--font-bold)',
            color: '#1C1C1C',
            marginBottom: 12
          }}>
            {toki.title}
          </h1>
          
          {toki.description && (
            <p style={{
              fontSize: 16,
              color: '#6B7280',
              lineHeight: 1.6,
              marginBottom: 24
            }}>
              {toki.description}
            </p>
          )}
          
          {/* Info Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 24
          }}>
            <InfoItem icon="📍" label="Location" value={toki.location} />
            <InfoItem icon="🕐" label="Time Slot" value={formatTimeSlot(toki.timeSlot)} />
            {toki.scheduledTime && (
              <InfoItem icon="📅" label="Scheduled Time" value={new Date(toki.scheduledTime).toLocaleString()} />
            )}
            <InfoItem icon="📂" label="Category" value={toki.category} />
            {toki.maxAttendees && (
              <InfoItem icon="👥" label="Max Attendees" value={String(toki.maxAttendees)} />
            )}
            {toki.visibility && (
              <InfoItem icon="🔒" label="Visibility" value={toki.visibility} />
            )}
            {toki.host_id && (
              <InfoItem icon="👤" label="Host ID" value={toki.host_id} />
            )}
            {toki.latitude && toki.longitude && (
              <InfoItem icon="🗺️" label="Coordinates" value={`${toki.latitude}, ${toki.longitude}`} />
            )}
          </div>

          {/* Tags */}
          {toki.tags && toki.tags.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{
                fontSize: 16,
                fontFamily: 'var(--font-semi)',
                color: '#1C1C1C',
                marginBottom: 12
              }}>
                Tags
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {toki.tags.map((tag: string, idx: number) => (
                  <span key={idx} style={{
                    padding: '6px 12px',
                    borderRadius: 9999,
                    background: 'rgba(139, 92, 246, 0.1)',
                    color: '#8B5CF6',
                    fontSize: 14
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* External Link */}
          {toki.externalLink && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{
                fontSize: 16,
                fontFamily: 'var(--font-semi)',
                color: '#1C1C1C',
                marginBottom: 8
              }}>
                External Link
              </h3>
              <a 
                href={toki.externalLink} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: '#8B5CF6',
                  textDecoration: 'underline',
                  wordBreak: 'break-all'
                }}
              >
                {toki.externalLink}
              </a>
            </div>
          )}

          {/* Validation Errors */}
          {validation?.errors && validation.errors.length > 0 && (
            <div style={{
              padding: 16,
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 12,
              marginBottom: 24
            }}>
              <h3 style={{
                fontSize: 16,
                fontFamily: 'var(--font-semi)',
                color: '#EF4444',
                marginBottom: 12
              }}>
                Validation Errors
              </h3>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validation.errors.map((error, i) => (
                  <li key={i} style={{ fontSize: 14, color: '#EF4444', marginBottom: 8 }}>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {validation?.warnings && validation.warnings.length > 0 && (
            <div style={{
              padding: 16,
              background: 'rgba(245, 158, 11, 0.1)',
              borderRadius: 12,
              marginBottom: 24
            }}>
              <h3 style={{
                fontSize: 16,
                fontFamily: 'var(--font-semi)',
                color: '#F59E0B',
                marginBottom: 12
              }}>
                Warnings
              </h3>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validation.warnings.map((warning, i) => (
                  <li key={i} style={{ fontSize: 14, color: '#F59E0B', marginBottom: 8 }}>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button 
              className="btn-primary" 
              onClick={onClose}
              style={{
                background: 'rgba(107, 114, 128, 0.8)'
              }}
            >
              Close
            </button>
            {onEdit && (
              <button 
                className="btn-primary" 
                onClick={onEdit}
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{
      padding: 12,
      background: 'rgba(255, 255, 255, 0.6)',
      borderRadius: 8
    }}>
      <div style={{
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
        fontFamily: 'var(--font-medium)'
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 16,
        color: '#1C1C1C',
        fontFamily: 'var(--font-semi)',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <span>{icon}</span>
        <span>{value}</span>
      </div>
    </div>
  );
}
