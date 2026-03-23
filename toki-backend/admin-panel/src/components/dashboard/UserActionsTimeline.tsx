import { useState, useEffect, useMemo } from 'react';
import { adminApi } from '../../services/adminApi';
import { Smartphone, Globe, Clock, Activity, Terminal, Settings } from 'lucide-react';

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
    resource_name?: string;
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
    const [showTechnical, setShowTechnical] = useState(false);

    useEffect(() => {
        loadActivity();
    }, [userId]);

    const loadActivity = async () => {
        setLoading(true);
        try {
            const resp = await adminApi.getUserActivity(userId, 200) as any;
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

    const getPlatformIcon = (platform: string) => {
        const p = platform?.toLowerCase();
        if (p === 'ios' || p === 'android') return <Smartphone size={14} />;
        if (p === 'web') return <Globe size={14} />;
        return <Terminal size={14} />;
    };

    const getNarrative = (log: ActivityLog) => {
        if (log.event_type === 'frontend_action' && log.metadata?.action) {
            switch (log.metadata.action) {
                case 'map_tap': return 'Explored the map';
                case 'event_viewed': return 'Viewed event details';
                case 'filter_applied': return `Applied a filter${log.metadata.filter ? ` (${log.metadata.filter})` : ''}`;
                case 'profile_viewed': return 'Viewed a user profile';
                case 'app_open': return 'Opened the Toki app';
                case 'push_opened': return 'Opened a push notification';
                default: return log.metadata.action.replace(/_/g, ' ');
            }
        }

        if (log.event_type === 'connect') return 'Connected to the server';
        if (log.event_type === 'disconnect') return 'Disconnected from the server';

        if (log.method && log.path) {
            const path = log.path.toLowerCase();

            if (path.includes('/auth/me')) return 'Verified session';
            if (path.includes('/auth/login')) return 'Logged into the app';

            if (path.includes('/messages/conversations/') || path.includes('/messages/')) {
                if (log.method === 'POST') return 'Sent a message';
                if (path.includes('/conversations/')) return 'Opened a chat conversation';
                return 'Opened chat inbox';
            }

            if (path.includes('/tokis/') || path.includes('/event/')) {
                const name = log.resource_name;
                if (log.method === 'GET' && path.includes('/friends-attending')) return `Checked who is attending ${name || 'an event'}`;
                if (log.method === 'GET') return `Viewed details for ${name || 'an event'}`;
                if (log.method === 'POST' && path.endsWith('/join')) return `Joined ${name || 'an event'}`;
                if (log.method === 'DELETE' && path.endsWith('/join')) return `Left ${name || 'an event'}`;
                if (log.method === 'PUT') return `Updated ${name || 'an event'}`;
                if (log.method === 'POST') return `Created a new event: ${name || ''}`;
            }

            if (path.endsWith('/tokis') || path.endsWith('/nearby') || path.endsWith('/combined')) {
                const q = log.metadata?.query;
                if (q?.latitude && q?.longitude) {
                    return `Browsed activities near ${Number(q.latitude).toFixed(2)}, ${Number(q.longitude).toFixed(2)}`;
                }
                return 'Browsed the map or event list';
            }

            if (path.includes('/notifications')) return 'Checked notifications';
            if (path.includes('/connections/pending')) return 'Checked pending requests';
            if (path.includes('/connections')) return 'Viewed connections';

            if (path.includes('/users/')) return 'Viewed another user profile';
            if (path.includes('/search')) return 'Searched platform';
            if (path.includes('/report')) return 'Reported an issue';

            if (path.includes('/check/')) return 'Background status check';
            if (path.includes('/health')) return 'System health check';
        }

        return 'Active on the platform';
    };

    const processedSessions = useMemo(() => {
        if (logs.length === 0) return [];

        const SESSION_GAP_MS = 30 * 60 * 1000;
        const sessions: any[] = [];
        let currentSession: any = null;

        for (let i = 0; i < logs.length; i++) {
            const log = logs[i];
            const prevLog = logs[i - 1];

            const isNewSession = !prevLog || (new Date(prevLog.created_at).getTime() - new Date(log.created_at).getTime() > SESSION_GAP_MS);

            if (isNewSession) {
                if (currentSession) {
                    const oldestInSession = currentSession.items[currentSession.items.length - 1];
                    const newestInSession = currentSession.items[0];
                    currentSession.startTime = oldestInSession.created_at;
                    currentSession.duration = Math.max(0, new Date(newestInSession.created_at).getTime() - new Date(oldestInSession.created_at).getTime());
                }
                currentSession = {
                    items: [],
                    primaryPlatform: log.device_platform,
                    duration: 0
                };
                sessions.push(currentSession);
            }

            const narrative = getNarrative(log);
            const lastAddedItem = currentSession.items[currentSession.items.length - 1];

            if (lastAddedItem && lastAddedItem.narrative === narrative &&
                Math.abs(new Date(lastAddedItem.created_at).getTime() - new Date(log.created_at).getTime()) < 60000) {
                lastAddedItem.count = (lastAddedItem.count || 1) + 1;
                lastAddedItem.technicalTrace.push(log);
            } else {
                currentSession.items.push({
                    ...log,
                    narrative,
                    count: 1,
                    technicalTrace: [log]
                });
            }
        }

        if (currentSession) {
            const oldestInSession = currentSession.items[currentSession.items.length - 1];
            const newestInSession = currentSession.items[0];
            currentSession.startTime = oldestInSession.created_at;
            currentSession.duration = Math.max(0, new Date(newestInSession.created_at).getTime() - new Date(oldestInSession.created_at).getTime());
        }

        return sessions;
    }, [logs]);

    const formatDuration = (ms: number) => {
        if (ms < 1000) return 'Momentary';
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        if (mins === 0) return `${secs}s`;
        return `${mins}m ${secs}s`;
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
            backdropFilter: 'blur(8px)'
        }}>
            <div style={{
                backgroundColor: 'white',
                width: '95%',
                maxWidth: '1000px',
                height: '90%',
                borderRadius: '32px',
                padding: '40px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '24px',
                        right: '24px',
                        background: '#F1F5F9',
                        border: 'none',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        cursor: 'pointer',
                        color: '#475569',
                        zIndex: 20,
                        transition: 'all 0.2s'
                    }}
                >
                    ✕
                </button>

                <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px', color: '#0F172A' }}>
                            User Journey: {userName || 'Active User'}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#64748B' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F1F5F9', padding: '4px 12px', borderRadius: '8px', fontWeight: '600' }}>
                                <Activity size={16} color="#8B5CF6" /> {logs.length} Actions
                            </span>
                            <span style={{ color: '#E2E8F0' }}>|</span>
                            <code style={{ fontSize: '12px', opacity: 0.7 }}>{userId}</code>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowTechnical(!showTechnical)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            backgroundColor: showTechnical ? '#8B5CF6' : 'white',
                            color: showTechnical ? 'white' : '#64748B',
                            border: `1px solid ${showTechnical ? '#8B5CF6' : '#E2E8F0'}`,
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: showTechnical ? '0 10px 15px -3px rgba(139, 92, 246, 0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        <Settings size={18} />
                        {showTechnical ? 'Technical View: On' : 'Advanced View'}
                    </button>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px',
                    padding: '14px 24px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '16px',
                    marginBottom: '20px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#94A3B8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    <div style={{ width: '80px' }}>Time</div>
                    <div style={{ flex: 1.5 }}>Activity Narrative</div>
                    {showTechnical && <div style={{ flex: 1 }}>API Trace</div>}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 40px 8px' }}>
                    {loading ? (
                        <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '32px', height: '32px', border: '3px solid #8B5CF6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                <span style={{ color: '#64748B', fontWeight: '500' }}>Reconstructing journey...</span>
                            </div>
                        </div>
                    ) : error ? (
                        <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#EF4444' }}>
                            {error}
                        </div>
                    ) : processedSessions.length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#64748B' }}>
                            No journey data found for this user.
                        </div>
                    ) : (
                        processedSessions.map((session, sIdx) => (
                            <div key={`session-${sIdx}`} style={{ marginBottom: '32px' }}>
                                <div style={{
                                    padding: '20px 24px',
                                    backgroundColor: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '20px',
                                    marginBottom: '20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#8B5CF6', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.2)' }}>
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>
                                                Session Started: {new Date(session.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    {getPlatformIcon(session.primaryPlatform)}
                                                    {session.primaryPlatform || 'Unknown Device'}
                                                </span>
                                                <span style={{ color: '#CBD5E1' }}>•</span>
                                                <span>{session.items.reduce((acc: number, item: any) => acc + item.count, 0)} Total Actions</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>Session Duration</div>
                                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#8B5CF6' }}>
                                            {formatDuration(session.duration)}
                                        </div>
                                    </div>
                                </div>

                                {session.items.map((item: any, iIdx: number) => (
                                    <div key={item.id} style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '24px',
                                        padding: '16px 20px',
                                        borderLeft: '2px solid #E2E8F0',
                                        marginLeft: '20px',
                                        position: 'relative',
                                        transition: 'all 0.2s',
                                        backgroundColor: iIdx % 2 === 0 ? 'transparent' : 'rgba(248, 250, 252, 0.8)',
                                        borderRadius: '0 12px 12px 0'
                                    }}>
                                        <div style={{
                                            position: 'absolute',
                                            left: '-10px',
                                            top: '22px',
                                            width: '18px',
                                            height: '18px',
                                            borderRadius: '50%',
                                            backgroundColor: item.event_type === 'frontend_action' ? '#8B5CF6' : '#94A3B8',
                                            border: '4px solid white',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                        }} />

                                        <div style={{ width: '80px', flexShrink: 0, fontSize: '14px', fontWeight: '600', color: '#64748B', paddingTop: '2px' }}>
                                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>

                                        <div style={{ flex: 1.5 }}>
                                            <div style={{
                                                fontSize: (item.narrative.includes('Background') || item.narrative.includes('Verified session')) ? '14px' : '16px',
                                                color: (item.narrative.includes('Background') || item.narrative.includes('Verified session')) ? '#64748B' : '#1E293B',
                                                fontWeight: (item.narrative.includes('Background') || item.narrative.includes('Verified session')) ? '500' : '650',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                opacity: (item.narrative.includes('Background') || item.narrative.includes('Verified session')) ? 0.8 : 1
                                            }}>
                                                {item.narrative}
                                                {item.count > 1 && (
                                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#8B5CF6', backgroundColor: '#F5F3FF', padding: '2px 10px', borderRadius: '20px', border: '1px solid #DDD6FE' }}>
                                                        {item.count} REPEATS
                                                    </span>
                                                )}
                                            </div>
                                            {item.metadata && Object.keys(item.metadata).length > 0 && !showTechnical && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                                                    {Object.entries(item.metadata).map(([k, v]) => (
                                                        !['action', 'screen', 'platform'].includes(k) && (
                                                            <span key={k} style={{ fontSize: '11px', fontWeight: '600', color: '#475569', backgroundColor: 'white', border: '1px solid #E2E8F0', padding: '2px 10px', borderRadius: '6px' }}>
                                                                {k}: <span style={{ color: '#0F172A' }}>{typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}</span>
                                                            </span>
                                                        )
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {showTechnical && (
                                            <div style={{ flex: 1 }}>
                                                {item.technicalTrace.map((t: any, tIdx: number) => (
                                                    <div key={t.id} style={{
                                                        backgroundColor: 'white',
                                                        padding: '12px',
                                                        borderRadius: '10px',
                                                        border: '1px solid #E2E8F0',
                                                        marginBottom: tIdx < item.technicalTrace.length - 1 ? '8px' : 0,
                                                        fontSize: '11px',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                            <span style={{ fontWeight: '800', color: t.event_type === 'frontend_action' ? '#8B5CF6' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                                {t.method || t.event_type}
                                                            </span>
                                                            {t.status_code && (
                                                                <span style={{
                                                                    color: getStatusColor(t.status_code),
                                                                    fontWeight: '800',
                                                                    backgroundColor: `${getStatusColor(t.status_code)}11`,
                                                                    padding: '1px 6px',
                                                                    borderRadius: '4px'
                                                                }}>
                                                                    {t.status_code}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ color: '#64748B', fontFamily: 'monospace', wordBreak: 'break-all', opacity: 0.8 }}>
                                                            {t.path || '-'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {sIdx < processedSessions.length - 1 && (
                                    <div style={{ height: '32px', borderLeft: '2px dashed #E2E8F0', marginLeft: '36px' }} />
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}} />
        </div>
    );
}
