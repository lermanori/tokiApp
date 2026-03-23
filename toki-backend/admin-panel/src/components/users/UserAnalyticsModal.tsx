import { useState, useEffect } from 'react';
import { adminApi } from '../../services/adminApi';

interface UserAnalyticsStats {
    appOpens: number;
    activeDays: number;
    avgSessionSeconds: number;
    eventViews: number;
    eventClicks: number;
    tokisCreated: number;
    tokisJoined: number;
    lastActive: string | null;
}

interface UserAnalyticsModalProps {
    userId: string;
    userName: string;
    onClose: () => void;
}

export default function UserAnalyticsModal({ userId, userName, onClose }: UserAnalyticsModalProps) {
    const [stats, setStats] = useState<UserAnalyticsStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const data = await adminApi.getUserAnalyticsStats(userId);
                setStats(data);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch user analytics');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [userId]);

    const formatDuration = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Never';
        return new Date(dateStr).toLocaleString();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ width: 500, maxWidth: '90%' }}>
                <h2 style={{ marginBottom: 20, fontFamily: 'var(--font-bold)', color: '#1C1C1C' }}>
                    Analytics for {userName}
                </h2>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading stats...</div>
                ) : error ? (
                    <div style={{ padding: 20, color: '#EF4444', backgroundColor: '#FEE2E2', borderRadius: 8 }}>{error}</div>
                ) : stats ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                        <div className="stat-box" style={{ padding: 16, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>App Opens</div>
                            <div style={{ fontSize: 24, fontFamily: 'var(--font-bold)', color: '#1C1C1C' }}>{stats.appOpens}</div>
                        </div>

                        <div className="stat-box" style={{ padding: 16, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Active Days</div>
                            <div style={{ fontSize: 24, fontFamily: 'var(--font-bold)', color: '#1C1C1C' }}>{stats.activeDays}</div>
                        </div>

                        <div className="stat-box" style={{ padding: 16, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Avg Session Length</div>
                            <div style={{ fontSize: 24, fontFamily: 'var(--font-bold)', color: '#1C1C1C' }}>{formatDuration(stats.avgSessionSeconds)}</div>
                        </div>

                        <div className="stat-box" style={{ padding: 16, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Last Active</div>
                            <div style={{ fontSize: 14, fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginTop: 4 }}>{formatDate(stats.lastActive)}</div>
                        </div>

                        <div className="stat-box" style={{ padding: 16, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Event Views</div>
                            <div style={{ fontSize: 24, fontFamily: 'var(--font-bold)', color: '#1C1C1C' }}>{stats.eventViews}</div>
                        </div>

                        <div className="stat-box" style={{ padding: 16, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Map Taps (Clicks)</div>
                            <div style={{ fontSize: 24, fontFamily: 'var(--font-bold)', color: '#1C1C1C' }}>{stats.eventClicks}</div>
                        </div>

                        <div className="stat-box" style={{ padding: 16, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Tokis Created</div>
                            <div style={{ fontSize: 24, fontFamily: 'var(--font-bold)', color: '#1C1C1C' }}>{stats.tokisCreated}</div>
                        </div>

                        <div className="stat-box" style={{ padding: 16, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Tokis Joined</div>
                            <div style={{ fontSize: 24, fontFamily: 'var(--font-bold)', color: '#1C1C1C' }}>{stats.tokisJoined}</div>
                        </div>

                    </div>
                ) : null}

                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}
