import { useState, useEffect, useRef } from 'react';
import { adminApi } from '../../services/adminApi';

interface TokenInfo {
    issuedAt: Date;
    expiresAt: Date;
    timeAliveMs: number;
    timeRemainingMs: number;
    isExpired: boolean;
}

interface TokenConfig {
    accessExpiresIn: string;
    refreshExpiresIn: string;
}

interface UserInfo {
    id: string;
    name: string;
    email: string;
}

interface ProbeStatus {
    type: 'idle' | 'success' | 'refresh' | 'error';
    message: string;
    timestamp: Date | null;
}

const SHORT_DEMO_PRESET: TokenConfig = {
    accessExpiresIn: '15s',
    refreshExpiresIn: '2m',
};

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
    const [serverTokenConfig, setServerTokenConfig] = useState<TokenConfig | null>(null);
    const [activeTokenConfig, setActiveTokenConfig] = useState<TokenConfig | null>(null);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [draftAccessExpiresIn, setDraftAccessExpiresIn] = useState(SHORT_DEMO_PRESET.accessExpiresIn);
    const [draftRefreshExpiresIn, setDraftRefreshExpiresIn] = useState(SHORT_DEMO_PRESET.refreshExpiresIn);
    const [isIssuingSession, setIsIssuingSession] = useState(false);
    const [isRunningProbe, setIsRunningProbe] = useState(false);
    const [probeStatus, setProbeStatus] = useState<ProbeStatus>({
        type: 'idle',
        message: 'Issue a short-lived access token, wait for it to expire, then run a protected request.',
        timestamp: null,
    });
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const decodeAndSetTokens = () => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            setError('No admin token found in localStorage');
            setAccessTokenInfo(null);
            setRefreshTokenInfo(null);
            return;
        }

        const payload = decodeJwtPayload(token);
        if (!payload || !payload.iat || !payload.exp) {
            setError('Failed to decode admin token');
            setAccessTokenInfo(null);
            return;
        }

        setError(null);
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
        } else {
            setRefreshTokenInfo(null);
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
                setServerTokenConfig(response.data.tokenConfig);
                setActiveTokenConfig((current) => current || response.data.tokenConfig);
                setUserInfo(response.data.user);
            }
        } catch (e: any) {
            console.error('Failed to load token config:', e);
        }
    };

    const applyServerPreset = () => {
        setDraftAccessExpiresIn(serverTokenConfig?.accessExpiresIn || '24h');
        setDraftRefreshExpiresIn(serverTokenConfig?.refreshExpiresIn || '7d');
    };

    const applyShortPreset = () => {
        setDraftAccessExpiresIn(SHORT_DEMO_PRESET.accessExpiresIn);
        setDraftRefreshExpiresIn(SHORT_DEMO_PRESET.refreshExpiresIn);
    };

    const issueDebugSession = async () => {
        setIsIssuingSession(true);
        setError(null);
        try {
            const response = await adminApi.issueTokenDebugSession({
                accessExpiresIn: draftAccessExpiresIn,
                refreshExpiresIn: draftRefreshExpiresIn,
            }) as any;

            if (!response.success || !response.data?.tokens) {
                throw new Error(response.message || 'Failed to issue debug tokens');
            }

            localStorage.setItem('admin_token', response.data.tokens.accessToken);
            localStorage.setItem('admin_refresh_token', response.data.tokens.refreshToken);
            setActiveTokenConfig(response.data.tokenConfig);
            setUserInfo(response.data.user);
            decodeAndSetTokens();
            setProbeStatus({
                type: 'success',
                message: `Issued debug session with access ${response.data.tokenConfig.accessExpiresIn} and refresh ${response.data.tokenConfig.refreshExpiresIn}.`,
                timestamp: new Date(),
            });
        } catch (e: any) {
            const message = e?.message || 'Failed to issue debug tokens';
            setError(message);
            setProbeStatus({
                type: 'error',
                message,
                timestamp: new Date(),
            });
        } finally {
            setIsIssuingSession(false);
        }
    };

    const runProtectedProbe = async () => {
        setIsRunningProbe(true);
        setError(null);
        const previousAccessToken = localStorage.getItem('admin_token');

        try {
            const response = await adminApi.probeTokenDebug() as any;
            const nextAccessToken = localStorage.getItem('admin_token');
            const didRefresh = !!previousAccessToken && !!nextAccessToken && previousAccessToken !== nextAccessToken;

            if (didRefresh && serverTokenConfig) {
                setActiveTokenConfig(serverTokenConfig);
            }

            decodeAndSetTokens();

            setProbeStatus({
                type: didRefresh ? 'refresh' : 'success',
                message: didRefresh
                    ? 'Protected request succeeded and the access token was refreshed automatically.'
                    : (accessTokenInfo?.isExpired
                        ? 'Protected request succeeded, but the access token did not rotate as expected.'
                        : (response.message || 'Protected request succeeded with the current access token.')),
                timestamp: new Date(),
            });
        } catch (e: any) {
            const message = e?.message || 'Protected request failed';
            setError(message);
            decodeAndSetTokens();
            setProbeStatus({
                type: 'error',
                message,
                timestamp: new Date(),
            });
        } finally {
            setIsRunningProbe(false);
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
                    {serverTokenConfig && (
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px', fontFamily: 'var(--font-medium)' }}>
                                Server Config
                            </div>
                            <div style={{ fontSize: '13px', color: '#666' }}>
                                Access: <strong>{serverTokenConfig.accessExpiresIn}</strong> · Refresh: <strong>{serverTokenConfig.refreshExpiresIn}</strong>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '24px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                }}>
                    <div>
                        <div style={{ fontSize: '16px', fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: '4px' }}>
                            Refresh Demo Controls
                        </div>
                        <div style={{ fontSize: '13px', color: '#666', maxWidth: '720px' }}>
                            Pick either the real server config or a short demo pair, issue the tokens into this admin session, let the access token expire, then run a protected request to watch refresh take over.
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <ActionButton label="Use Server Config" onClick={applyServerPreset} tone="secondary" />
                        <ActionButton label="Use Short Demo" onClick={applyShortPreset} tone="secondary" />
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '16px',
                    marginBottom: '16px',
                }}>
                    <LabeledInput
                        label="Access Token Duration"
                        value={draftAccessExpiresIn}
                        onChange={setDraftAccessExpiresIn}
                        placeholder="15s"
                    />
                    <LabeledInput
                        label="Refresh Token Duration"
                        value={draftRefreshExpiresIn}
                        onChange={setDraftRefreshExpiresIn}
                        placeholder="2m"
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <ActionButton
                        label={isIssuingSession ? 'Issuing…' : 'Issue Debug Tokens'}
                        onClick={issueDebugSession}
                        disabled={isIssuingSession || !draftAccessExpiresIn || !draftRefreshExpiresIn}
                    />
                    <ActionButton
                        label={isRunningProbe ? 'Running Request…' : 'Run Protected Request'}
                        onClick={runProtectedProbe}
                        disabled={isRunningProbe}
                        tone="secondary"
                    />
                </div>

                <div style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: `1px solid ${getStatusTone(probeStatus.type).border}`,
                    background: getStatusTone(probeStatus.type).background,
                    color: getStatusTone(probeStatus.type).text,
                }}>
                    <div style={{ fontSize: '13px', fontFamily: 'var(--font-semi)', marginBottom: '4px' }}>
                        Last protected-request result
                    </div>
                    <div style={{ fontSize: '14px' }}>{probeStatus.message}</div>
                    {probeStatus.timestamp && (
                        <div style={{ fontSize: '12px', color: '#777', marginTop: '6px' }}>
                            {probeStatus.timestamp.toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>

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
                        value={activeTokenConfig?.accessExpiresIn || '24h'}
                    />
                    <StatMini
                        label="Refresh Expiry Duration"
                        value={activeTokenConfig?.refreshExpiresIn || '7d'}
                    />
                    <StatMini
                        label="Refresh Demo Preset"
                        value={`${SHORT_DEMO_PRESET.accessExpiresIn} / ${SHORT_DEMO_PRESET.refreshExpiresIn}`}
                    />
                </div>
            )}
        </div>
    );
}

function ActionButton({
    label,
    onClick,
    disabled,
    tone = 'primary',
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    tone?: 'primary' | 'secondary';
}) {
    const isPrimary = tone === 'primary';

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                border: 'none',
                borderRadius: '999px',
                padding: '10px 16px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-semi)',
                fontSize: '13px',
                background: disabled
                    ? 'rgba(156, 163, 175, 0.25)'
                    : isPrimary
                        ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)'
                        : 'rgba(139, 92, 246, 0.08)',
                color: disabled
                    ? '#999'
                    : isPrimary
                        ? '#FFF'
                        : '#6D28D9',
                boxShadow: isPrimary && !disabled ? '0 12px 24px rgba(139, 92, 246, 0.22)' : 'none',
            }}
        >
            {label}
        </button>
    );
}

function LabeledInput({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}) {
    return (
        <label style={{ display: 'block' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px', fontFamily: 'var(--font-medium)' }}>
                {label}
            </div>
            <input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                style={{
                    width: '100%',
                    borderRadius: '14px',
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                    padding: '12px 14px',
                    fontSize: '14px',
                    fontFamily: 'var(--font-semi)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    color: '#1C1C1C',
                    outline: 'none',
                    boxSizing: 'border-box',
                }}
            />
        </label>
    );
}

function getStatusTone(type: ProbeStatus['type']) {
    switch (type) {
        case 'refresh':
            return {
                background: 'rgba(16, 185, 129, 0.1)',
                border: 'rgba(16, 185, 129, 0.25)',
                text: '#047857',
            };
        case 'error':
            return {
                background: 'rgba(239, 68, 68, 0.08)',
                border: 'rgba(239, 68, 68, 0.22)',
                text: '#B91C1C',
            };
        case 'success':
            return {
                background: 'rgba(59, 130, 246, 0.08)',
                border: 'rgba(59, 130, 246, 0.2)',
                text: '#1D4ED8',
            };
        default:
            return {
                background: 'rgba(139, 92, 246, 0.08)',
                border: 'rgba(139, 92, 246, 0.2)',
                text: '#6D28D9',
            };
    }
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
