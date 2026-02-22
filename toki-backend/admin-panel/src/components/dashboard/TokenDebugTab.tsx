import { useState, useEffect, useRef } from 'react';
import { adminApi } from '../../services/adminApi';

interface TokenInfo {
    issuedAt: Date;
    expiresAt: Date;
    timeAliveMs: number;
    timeRemainingMs: number;
    isExpired: boolean;
}

function decodeJwtPayload(token: string): any | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(payload);
    } catch {
        return null;
    }
}


function formatDuration(ms: number): string {
    if (ms <= 0) return 'Expired';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
}

function getTokenInfo(iat: number, exp: number): TokenInfo {
    const issuedAt = new Date(iat * 1000);
    const expiresAt = new Date(exp * 1000);
    const now = Date.now();
    const timeAliveMs = now - issuedAt.getTime();
    const timeRemainingMs = expiresAt.getTime() - now;
    return {
        issuedAt,
        expiresAt,
        timeAliveMs,
        timeRemainingMs,
        isExpired: timeRemainingMs <= 0,
    };
}

function TokenCard({ label, info, color }: { label: string; info: TokenInfo; color: string }) {
    const progressPercent = info.timeAliveMs / (info.timeAliveMs + Math.max(info.timeRemainingMs, 0)) * 100;

    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'var(--glass-blur)',
            border: `1px solid ${info.isExpired ? 'rgba(239, 68, 68, 0.4)' : 'var(--glass-border)'}`,
            borderRadius: 'var(--border-radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-md)',
        }}>
            <h3 style={{
                fontSize: '16px',
                fontFamily: 'var(--font-semi)',
                marginBottom: '16px',
                color: info.isExpired ? '#EF4444' : '#1C1C1C',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
            }}>
                <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: info.isExpired ? '#EF4444' : '#10B981',
                    display: 'inline-block',
                    animation: info.isExpired ? 'none' : 'pulse 2s infinite',
                }} />
                {label}
                {info.isExpired && (
                    <span style={{
                        fontSize: '12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#EF4444',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontFamily: 'var(--font-medium)',
                    }}>
                        EXPIRED
                    </span>
                )}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px', fontFamily: 'var(--font-medium)' }}>
                        Issued At
                    </div>
                    <div style={{ fontSize: '14px', fontFamily: 'var(--font-semi)', color: '#333' }}>
                        {info.issuedAt.toLocaleString()}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px', fontFamily: 'var(--font-medium)' }}>
                        Expires At
                    </div>
                    <div style={{ fontSize: '14px', fontFamily: 'var(--font-semi)', color: '#333' }}>
                        {info.expiresAt.toLocaleString()}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px', fontFamily: 'var(--font-medium)' }}>
                        Time Alive
                    </div>
                    <div style={{
                        fontSize: '20px',
                        fontFamily: 'var(--font-bold)',
                        background: `linear-gradient(135deg, ${color}, ${color}CC)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        {formatDuration(info.timeAliveMs)}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px', fontFamily: 'var(--font-medium)' }}>
                        Time Remaining
                    </div>
                    <div style={{
                        fontSize: '20px',
                        fontFamily: 'var(--font-bold)',
                        color: info.isExpired ? '#EF4444' : info.timeRemainingMs < 3600000 ? '#F59E0B' : '#10B981',
                    }}>
                        {formatDuration(info.timeRemainingMs)}
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div style={{
                height: '6px',
                background: 'rgba(0, 0, 0, 0.08)',
                borderRadius: '3px',
                overflow: 'hidden',
            }}>
                <div style={{
                    height: '100%',
                    width: `${Math.min(progressPercent, 100)}%`,
                    background: info.isExpired
                        ? '#EF4444'
                        : progressPercent > 80
                            ? '#F59E0B'
                            : `linear-gradient(90deg, ${color}, ${color}CC)`,
                    borderRadius: '3px',
                    transition: 'width 1s linear',
                }} />
            </div>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '4px',
                fontSize: '11px',
                color: '#999',
                fontFamily: 'var(--font-medium)',
            }}>
                <span>Issued</span>
                <span>{Math.round(progressPercent)}% elapsed</span>
                <span>Expiry</span>
            </div>
        </div>
    );
}

export default function TokenDebugTab() {
    const [accessTokenInfo, setAccessTokenInfo] = useState<TokenInfo | null>(null);
    const [refreshTokenInfo, setRefreshTokenInfo] = useState<TokenInfo | null>(null);
    const [tokenConfig, setTokenConfig] = useState<{ accessExpiresIn: string; refreshExpiresIn: string } | null>(null);
    const [userInfo, setUserInfo] = useState<{ id: string; name: string; email: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const decodeAndSetTokens = () => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            setError('No admin token found in localStorage');
            return;
        }

        const payload = decodeJwtPayload(token);
        if (!payload || !payload.iat || !payload.exp) {
            setError('Failed to decode admin token');
            return;
        }

        setAccessTokenInfo(getTokenInfo(payload.iat, payload.exp));
        setUserInfo({ id: payload.id, name: payload.name, email: payload.email });

        // Compute refresh token info if we have the config
        // The refresh token is stored separately; we decode it too
        const authTokens = localStorage.getItem('admin_refresh_token');
        if (authTokens) {
            const refreshPayload = decodeJwtPayload(authTokens);
            if (refreshPayload && refreshPayload.iat && refreshPayload.exp) {
                setRefreshTokenInfo(getTokenInfo(refreshPayload.iat, refreshPayload.exp));
            }
        }

        setLastRefresh(new Date());
    };

    const loadServerConfig = async () => {
        try {
            // Get the user ID from the current admin token
            const token = localStorage.getItem('admin_token');
            if (!token) return;
            const payload = decodeJwtPayload(token);
            if (!payload?.id) return;

            const response = await adminApi.getTokenDebug(payload.id) as any;
            if (response.success && response.data) {
                setTokenConfig(response.data.tokenConfig);
            }
        } catch (e: any) {
            console.error('Failed to load token config:', e);
        }
    };

    useEffect(() => {
        decodeAndSetTokens();
        loadServerConfig();

        // Update every second for live countdown
        intervalRef.current = setInterval(() => {
            decodeAndSetTokens();
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return (
        <div>
            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
            }}>
                <div>
                    <h2 style={{
                        fontSize: '24px',
                        fontFamily: 'var(--font-bold)',
                        marginBottom: '4px',
                        color: '#1C1C1C',
                    }}>
                        Token Debug
                    </h2>
                    <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                        Monitor your JWT token lifetime to debug disconnection issues
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#999', fontFamily: 'var(--font-medium)' }}>
                        Auto-refreshing every second
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                        Last update: {lastRefresh.toLocaleTimeString()}
                    </div>
                </div>
            </div>

            {error && (
                <div style={{
                    padding: '16px 20px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--border-radius-md)',
                    color: '#EF4444',
                    marginBottom: '24px',
                    fontFamily: 'var(--font-medium)',
                }}>
                    {error}
                </div>
            )}

            {/* User Info Card */}
            {userInfo && (
                <div style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'var(--glass-blur)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: '20px 24px',
                    marginBottom: '24px',
                    boxShadow: 'var(--shadow-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px', fontFamily: 'var(--font-medium)' }}>
                            Logged in as
                        </div>
                        <div style={{ fontSize: '18px', fontFamily: 'var(--font-semi)', color: '#1C1C1C' }}>
                            {userInfo.name}
                        </div>
                        <div style={{ fontSize: '13px', color: '#666' }}>
                            {userInfo.email} · <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#999' }}>{userInfo.id}</span>
                        </div>
                    </div>
                    {tokenConfig && (
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px', fontFamily: 'var(--font-medium)' }}>
                                Server Config
                            </div>
                            <div style={{ fontSize: '13px', color: '#666' }}>
                                Access: <strong>{tokenConfig.accessExpiresIn}</strong> · Refresh: <strong>{tokenConfig.refreshExpiresIn}</strong>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Token Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: refreshTokenInfo ? '1fr 1fr' : '1fr',
                gap: '24px',
                marginBottom: '24px',
            }}>
                {accessTokenInfo && (
                    <TokenCard
                        label="Access Token (Admin Session)"
                        info={accessTokenInfo}
                        color="#8B5CF6"
                    />
                )}
                {refreshTokenInfo && (
                    <TokenCard
                        label="Refresh Token"
                        info={refreshTokenInfo}
                        color="#3B82F6"
                    />
                )}
            </div>

            {/* Summary Stats */}
            {accessTokenInfo && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '16px',
                }}>
                    <StatMini
                        label="Access Token Status"
                        value={accessTokenInfo.isExpired ? '🔴 Expired' : '🟢 Active'}
                    />
                    <StatMini
                        label="Access Expiry Duration"
                        value={tokenConfig?.accessExpiresIn || '24h'}
                    />
                    <StatMini
                        label="Refresh Expiry Duration"
                        value={tokenConfig?.refreshExpiresIn || '7d'}
                    />
                    <StatMini
                        label="Token Age"
                        value={formatDuration(accessTokenInfo.timeAliveMs)}
                    />
                </div>
            )}
        </div>
    );
}

function StatMini({ label, value }: { label: string; value: string }) {
    return (
        <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ color: '#888', fontSize: '12px', marginBottom: '6px', fontFamily: 'var(--font-medium)' }}>
                {label}
            </div>
            <div style={{
                fontSize: '18px',
                fontFamily: 'var(--font-bold)',
                color: '#1C1C1C',
            }}>
                {value}
            </div>
        </div>
    );
}
