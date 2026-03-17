import { useState, useEffect } from 'react';
import { adminApi } from '../../services/adminApi';

interface ActivityLog {
    id: string;
    event_type: string;
    method: string;
    path: string;
    status_code: number;
    device_platform: string;
    duration_ms: number;
    metadata: any;
    created_at: string;
}

interface UserActionsTimelineProps {
    userId: string;
    userName?: string;
    onClose: () => void;
}

export default function UserActionsTimeline({ userId, userName, onClose }: UserActionsTimelineProps) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadActivity();
    }, [userId]);

    const loadActivity = async () => {
        setLoading(true);
        try {
            const resp = await adminApi.getUserActivity(userId, 100) as any;
            if (resp.success) {
                setLogs(resp.data);
            }
        } catch (e: any) {
            setError(e.message || 'Failed to load activity');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (code: number) => {
        if (code >= 200 && code < 300) return '#10B981';
        if (code >= 300 && code < 400) return '#3B82F6';
        if (code >= 400 && code < 500) return '#F59E0B';
        return '#EF4444';
    };

    const getMethodColor = (method: string) => {
        switch (method?.toUpperCase()) {
            case 'GET': return '#6366F1';
            case 'POST': return '#10B981';
            case 'PUT': return '#F59E0B';
            case 'DELETE': return '#EF4444';
            default: return '#6B7280';
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                backgroundColor: 'white',
                width: '90%',
                maxWidth: '1000px',
                height: '80%',
                borderRadius: '20px',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '24px',
                        right: '24px',
                        background: 'none',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: '#666'
                    }}
                >
                    ✕
                </button>

                <h2 style={{ marginBottom: '8px', fontFamily: 'var(--font-bold)' }}>
                    Activity Timeline: {userName || 'User'}
                </h2>
                <p style={{ color: '#666', marginBottom: '24px', fontSize: '14px' }}>
                    Showing last 100 actions for user ID: <code>{userId}</code>
                </p>

                {loading ? (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        Loading activity logs...
                    </div>
                ) : error ? (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#EF4444' }}>
                        {error}
                    </div>
                ) : logs.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#666' }}>
                        No activity logs found for this user.
                    </div>
                ) : (
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '10px',
                        border: '1px solid #F3F4F6',
                        borderRadius: '12px'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                                <tr>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #F3F4F6', color: '#666', fontSize: '12px' }}>TIME</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #F3F4F6', color: '#666', fontSize: '12px' }}>METHOD</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #F3F4F6', color: '#666', fontSize: '12px' }}>PATH</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #F3F4F6', color: '#666', fontSize: '12px' }}>STATUS</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #F3F4F6', color: '#666', fontSize: '12px' }}>PLATFORM</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #F3F4F6', color: '#666', fontSize: '12px' }}>DURATION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid #F9FAFB' }}>
                                        <td style={{ padding: '12px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                backgroundColor: getMethodColor(log.method),
                                                color: 'white',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: 'bold'
                                            }}>
                                                {log.method || log.event_type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '13px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {log.path || '-'}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                color: getStatusColor(log.status_code),
                                                fontWeight: 'bold',
                                                fontSize: '13px'
                                            }}>
                                                {log.status_code || '-'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '13px', textTransform: 'capitalize' }}>
                                            {log.device_platform || 'unknown'}
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '13px' }}>
                                            {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
