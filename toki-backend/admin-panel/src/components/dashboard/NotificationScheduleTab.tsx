import { useState, useEffect } from 'react';
import { adminApi } from '../../services/adminApi';
import NotificationScheduleModal from './NotificationScheduleModal';

interface ScheduledNotification {
  id: string;
  title: string;
  message: string;
  day_of_week: number;
  hour: number;
  minute: number;
  enabled: boolean;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
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

function formatDate(iso?: string | null) {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleString();
}

function formatTime(hour: number, minute: number) {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export default function NotificationScheduleTab() {
  const [notifications, setNotifications] = useState<ScheduledNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState<{ mode: 'create' | 'edit'; notification?: ScheduledNotification } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const resp = await adminApi.getNotificationSchedule({ limit: 100 }) as any;
      setNotifications(resp.data?.notifications || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (id: string, currentEnabled: boolean) => {
    try {
      await adminApi.updateNotificationSchedule(id, { enabled: !currentEnabled });
      await loadNotifications();
    } catch (error) {
      console.error('Failed to toggle notification:', error);
      alert('Failed to update notification');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled notification?')) return;
    try {
      await adminApi.deleteNotificationSchedule(id);
      await loadNotifications();
    } catch (error) {
      console.error('Failed to delete notification:', error);
      alert('Failed to delete notification');
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const result = await adminApi.testNotificationSchedule(id) as any;
      alert(`Test notification sent to ${result.data?.sentTo || 0} users`);
    } catch (error: any) {
      alert(error?.message || 'Failed to send test notification');
    } finally {
      setTesting(null);
    }
  };

  return (
    <div>
      <h2 style={{
        fontSize: '24px',
        fontFamily: 'var(--font-bold)',
        marginBottom: '16px',
        color: '#1C1C1C'
      }}>
        Notification Schedule
      </h2>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          className="btn-primary"
          onClick={() => setModalOpen({ mode: 'create' })}
        >
          Create Notification
        </button>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.6)' }}>
                <th style={{ padding: '12px 16px' }}>Day</th>
                <th style={{ padding: '12px 16px' }}>Time</th>
                <th style={{ padding: '12px 16px' }}>Title</th>
                <th style={{ padding: '12px 16px' }}>Message</th>
                <th style={{ padding: '12px 16px' }}>Enabled</th>
                <th style={{ padding: '12px 16px' }}>Last Sent</th>
                <th style={{ padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 24 }}>Loading...</td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 24, color: '#666' }}>No scheduled notifications</td>
                </tr>
              ) : (
                notifications.map((n) => (
                  <tr key={n.id} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: '12px 16px' }}>{DAYS_OF_WEEK[n.day_of_week]}</td>
                    <td style={{ padding: '12px 16px' }}>{formatTime(n.hour, n.minute)}</td>
                    <td style={{ padding: '12px 16px' }}>{n.title}</td>
                    <td style={{ padding: '12px 16px', maxWidth: 300 }}>
                      {truncateText(n.message, 50)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        className="btn-primary"
                        onClick={() => handleToggleEnabled(n.id, n.enabled)}
                        style={{
                          background: n.enabled
                            ? 'linear-gradient(135deg, #10B981, #059669)'
                            : 'linear-gradient(135deg, #6B7280, #4B5563)',
                          padding: '4px 12px',
                          fontSize: '12px'
                        }}
                      >
                        {n.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#666' }}>
                      {formatDate(n.last_sent_at)}
                    </td>
                    <td style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                      <button
                        className="btn-primary"
                        onClick={() => handleTest(n.id)}
                        disabled={testing === n.id}
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                      >
                        {testing === n.id ? 'Sending...' : 'Test'}
                      </button>
                      <button
                        className="btn-primary"
                        onClick={() => setModalOpen({ mode: 'edit', notification: n })}
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-primary"
                        onClick={() => handleDelete(n.id)}
                        style={{
                          background: 'linear-gradient(135deg,#EF4444,#EC4899)',
                          padding: '4px 12px',
                          fontSize: '12px'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <NotificationScheduleModal
          initial={modalOpen.mode === 'edit' ? modalOpen.notification : undefined}
          onClose={() => setModalOpen(null)}
          onSaved={() => {
            setModalOpen(null);
            loadNotifications();
          }}
        />
      )}
    </div>
  );
}

