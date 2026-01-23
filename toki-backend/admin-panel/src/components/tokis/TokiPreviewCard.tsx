import { useState } from 'react';

interface TokiPreviewCardProps {
  toki: {
    title: string;
    description?: string;
    location: string;
    category: string;
    timeSlot: string;
    scheduledTime?: string;
    maxAttendees?: number | null;
    visibility?: string;
    tags?: string[];
    previewImage?: string;
    image?: string;
    images?: Array<{ url: string }>;
    host_id?: string;
    latitude?: number;
    longitude?: number;
    externalLink?: string;
    [key: string]: any;
  };
  validation?: {
    status: 'valid' | 'invalid';
    errors?: string[];
    warnings?: string[];
  };
  onEdit?: () => void;
  onViewDetails?: () => void;
}

function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    sports: '🏃‍♂️',
    coffee: '☕',
    music: '🎵',
    dinner: '🍝',
    work: '💼',
    culture: '🎨',
    nature: '🌳',
    drinks: '🍸',
    party: '🎉',
    wellness: '🧘',
    chill: '🏠',
    morning: '☀️',
    shopping: '🛍️',
    education: '📚',
    film: '🎬'
  };
  return emojis[category] || '📅';
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

export default function TokiPreviewCard({ toki, validation, onEdit, onViewDetails }: TokiPreviewCardProps) {
  const [imageError, setImageError] = useState(false);
  const displayImage = toki.previewImage || toki.image || (toki.images && toki.images[0]?.url);

  return (
    <div 
      className="glass-card" 
      style={{ 
        overflow: 'hidden',
        position: 'relative',
        cursor: onViewDetails ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}
      onClick={onViewDetails}
      onMouseEnter={(e) => {
        if (onViewDetails) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
      }}
    >
      {/* Validation Badge */}
      {validation && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
          padding: '4px 12px',
          borderRadius: 9999,
          background: validation.status === 'valid' 
            ? 'linear-gradient(135deg,#10B981,#4DC4AA)' 
            : 'linear-gradient(135deg,#EF4444,#EC4899)',
          color: 'white',
          fontSize: 12,
          fontFamily: 'var(--font-semi)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          {validation.status === 'valid' ? '✓ Valid' : '✗ Invalid'}
        </div>
      )}
      
      {/* Image Header */}
      <div style={{
        width: '100%',
        height: 180,
        background: 'linear-gradient(135deg,#8B5CF6,#EC4899)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {displayImage && !imageError ? (
          <img 
            src={displayImage} 
            alt={toki.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={() => setImageError(true)}
          />
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            fontSize: 48,
            opacity: 0.5
          }}>
            {getCategoryEmoji(toki.category)}
          </div>
        )}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)'
        }} />
      </div>
      
      {/* Content */}
      <div style={{ padding: 16 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8
        }}>
          <h3 style={{
            fontSize: 18,
            fontFamily: 'var(--font-semi)',
            color: '#1C1C1C',
            margin: 0,
            flex: 1,
            marginRight: 8
          }}>
            {toki.title}
          </h3>
          <span style={{
            padding: '4px 10px',
            borderRadius: 9999,
            background: 'linear-gradient(135deg,#8B5CF6,#EC4899)',
            color: 'white',
            fontSize: 12,
            fontFamily: 'var(--font-semi)',
            whiteSpace: 'nowrap'
          }}>
            {toki.category}
          </span>
        </div>
        
        {toki.description && (
          <p style={{
            fontSize: 14,
            color: '#6B7280',
            marginBottom: 12,
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {toki.description}
          </p>
        )}
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginBottom: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#6B7280' }}>
            <span>📍</span>
            <span>{toki.location}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#6B7280', flexWrap: 'wrap' }}>
            <span>🕐</span>
            <span>{formatTimeSlot(toki.timeSlot)}</span>
            {toki.scheduledTime && (
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                {new Date(toki.scheduledTime).toLocaleString()}
              </span>
            )}
          </div>
          {toki.maxAttendees && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#6B7280' }}>
              <span>👥</span>
              <span>Max {toki.maxAttendees} attendees</span>
            </div>
          )}
          {toki.visibility && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#6B7280' }}>
              <span>🔒</span>
              <span style={{ textTransform: 'capitalize' }}>{toki.visibility}</span>
            </div>
          )}
        </div>
        
        {toki.tags && toki.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {toki.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} style={{
                padding: '2px 8px',
                borderRadius: 9999,
                background: 'rgba(139, 92, 246, 0.1)',
                color: '#8B5CF6',
                fontSize: 11
              }}>
                #{tag}
              </span>
            ))}
            {toki.tags.length > 3 && (
              <span style={{
                padding: '2px 8px',
                borderRadius: 9999,
                background: 'rgba(139, 92, 246, 0.1)',
                color: '#8B5CF6',
                fontSize: 11
              }}>
                +{toki.tags.length - 3}
              </span>
            )}
          </div>
        )}
        
        {/* Error Messages */}
        {validation?.errors && validation.errors.length > 0 && (
          <div style={{
            padding: 8,
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: 8,
            marginBottom: 12
          }}>
            {validation.errors.slice(0, 3).map((error, i) => (
              <div key={i} style={{ fontSize: 12, color: '#EF4444', marginBottom: 4 }}>
                • {error}
              </div>
            ))}
            {validation.errors.length > 3 && (
              <div style={{ fontSize: 12, color: '#EF4444' }}>
                +{validation.errors.length - 3} more errors
              </div>
            )}
          </div>
        )}

        {/* Warnings */}
        {validation?.warnings && validation.warnings.length > 0 && (
          <div style={{
            padding: 8,
            background: 'rgba(245, 158, 11, 0.1)',
            borderRadius: 8,
            marginBottom: 12
          }}>
            {validation.warnings.slice(0, 2).map((warning, i) => (
              <div key={i} style={{ fontSize: 12, color: '#F59E0B', marginBottom: 4 }}>
                ⚠ {warning}
              </div>
            ))}
          </div>
        )}
        
        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {onEdit && (
            <button 
              className="btn-primary" 
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              style={{ flex: 1, fontSize: 14, padding: '8px 16px' }}
            >
              Edit
            </button>
          )}
          {onViewDetails && (
            <button 
              className="btn-primary" 
              onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
              style={{ 
                flex: 1, 
                fontSize: 14, 
                padding: '8px 16px',
                background: 'linear-gradient(135deg,#4DC4AA,#10B981)'
              }}
            >
              View Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
