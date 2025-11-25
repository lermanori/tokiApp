import { useState } from 'react';
import { adminApi } from '../../services/adminApi';

interface ScheduledNotification {
  id?: string;
  title: string;
  message: string;
  day_of_week: number;
  hour: number;
  minute: number;
  enabled: boolean;
}

interface Props {
  initial?: ScheduledNotification;
  onClose: () => void;
  onSaved: () => void;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export default function NotificationScheduleModal({ initial, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(initial?.title || '');
  const [message, setMessage] = useState(initial?.message || '');
  const [dayOfWeek, setDayOfWeek] = useState(initial?.day_of_week ?? 1);
  const [hour, setHour] = useState(initial?.hour ?? 12);
  const [minute, setMinute] = useState(initial?.minute ?? 0);
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Generate minute options (0-59 in 5-minute increments)
  const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (initial?.id) {
        await adminApi.updateNotificationSchedule(initial.id, {
          title,
          message,
          day_of_week: dayOfWeek,
          hour,
          minute,
          enabled
        });
      } else {
        await adminApi.createNotificationSchedule({
          title,
          message,
          day_of_week: dayOfWeek,
          hour,
          minute,
          enabled
        });
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Failed to save notification');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0 as any,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{ width: '100%', maxWidth: 600, padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-semi)', fontSize: 18 }}>
            {initial?.id ? 'Edit Notification' : 'Create Notification'}
          </h3>
          <button className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontFamily: 'var(--font-medium)' }}>
                Title
              </label>
              <input
                className="input-glass"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontFamily: 'var(--font-medium)' }}>
                Message
              </label>
              <textarea
                className="input-glass"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontFamily: 'var(--font-medium)' }}>
                Day of Week
              </label>
              <select
                className="input-glass"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                required
                style={{ width: '100%' }}
              >
                {DAYS_OF_WEEK.map((day, index) => (
                  <option key={index} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontFamily: 'var(--font-medium)' }}>
                  Hour (0-23)
                </label>
                <select
                  className="input-glass"
                  value={hour}
                  onChange={(e) => setHour(parseInt(e.target.value))}
                  required
                  style={{ width: '100%' }}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontFamily: 'var(--font-medium)' }}>
                  Minute
                </label>
                <select
                  className="input-glass"
                  value={minute}
                  onChange={(e) => setMinute(parseInt(e.target.value))}
                  required
                  style={{ width: '100%' }}
                >
                  {minuteOptions.map((m) => (
                    <option key={m} value={m}>
                      {m.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <span style={{ fontFamily: 'var(--font-medium)' }}>Enabled</span>
              </label>
            </div>

            {error && (
              <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, color: '#EF4444' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-primary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : initial?.id ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

