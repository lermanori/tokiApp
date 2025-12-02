import { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';

interface McpKeyInfo {
  id: string;
  name: string;
  scopes: string[];
  user_id: string | null; // Allow null for existing keys created before user_id was added
  created_by?: string | null;
  created_at: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
}

interface User {
  id: string;
  email: string;
  name?: string | null;
}

interface CreateKeyResponse {
  success: boolean;
  data: {
    key: string;
    keyInfo: McpKeyInfo;
  };
}

export default function McpKeysTab() {
  const [keys, setKeys] = useState<McpKeyInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyUserId, setNewKeyUserId] = useState('');
  const [newKeyPlaintext, setNewKeyPlaintext] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const loadKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await adminApi.getMcpKeys();
      setKeys(response.data || response);
    } catch (err: any) {
      setError(err.message || 'Failed to load MCP keys');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response: any = await adminApi.getUsers({ limit: 1000, role: 'admin' });
      setUsers(response.data?.users || response.users || []);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    void loadKeys();
    void loadUsers();
  }, []);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      setError('Name is required');
      return;
    }
    if (!newKeyUserId.trim()) {
      setError('User is required - this user will be the author for all Tokis created with this key');
      return;
    }
    try {
      setCreating(true);
      setError(null);
      const resp = (await adminApi.createMcpKey({
        name: newKeyName.trim(),
        scopes: ['admin'],
        user_id: newKeyUserId.trim(),
      })) as CreateKeyResponse;
      setNewKeyPlaintext(resp.data.key);
      setNewKeyName('');
      setNewKeyUserId('');
      await loadKeys();
    } catch (err: any) {
      setError(err.message || 'Failed to create MCP key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Revoke this MCP API key? This action cannot be undone.')) {
      return;
    }
    try {
      setError(null);
      await adminApi.revokeMcpKey(id);
      await loadKeys();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke MCP key');
    }
  };

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 'var(--border-radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        padding: '24px',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-semi)',
          fontSize: '20px',
          marginBottom: '16px',
        }}
      >
        MCP Admin API Keys
      </h2>

      <p style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>
        Create and manage API keys used by MCP clients (like MCP Inspector) to access admin tools.
        Each key is tied to a specific admin user who will be the author for all Tokis created with that key.
        Keys are shown <strong>only once</strong> when created—copy and store them securely.
      </p>

      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#b91c1c',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {/* Create key form */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Key name (e.g., Local Inspector)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '14px',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={newKeyUserId}
            onChange={(e) => setNewKeyUserId(e.target.value)}
            disabled={loadingUsers}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '14px',
              background: 'white',
            }}
          >
            <option value="">Select admin user (required)</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email} ({user.email})
              </option>
            ))}
          </select>
          <button
            onClick={handleCreateKey}
            disabled={creating || !newKeyUserId}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--primary-purple)',
              color: 'white',
              fontFamily: 'var(--font-medium)',
              cursor: 'pointer',
              opacity: creating || !newKeyUserId ? 0.7 : 1,
            }}
          >
            {creating ? 'Creating…' : 'Create Key'}
          </button>
        </div>
      </div>

      {newKeyPlaintext && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            fontSize: '14px',
          }}
        >
          <div style={{ marginBottom: '4px', fontWeight: 600 }}>New API Key (copy now):</div>
          <code
            style={{
              display: 'block',
              wordBreak: 'break-all',
              padding: '8px',
              background: '#0f172a',
              color: '#e5e7eb',
              borderRadius: '6px',
              fontSize: '13px',
            }}
          >
            {newKeyPlaintext}
          </code>
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#444' }}>
            This key will not be shown again. Store it in a secure secret manager or .env file.
          </div>
        </div>
      )}

      {/* Keys table */}
      <div
        style={{
          borderRadius: '8px',
          border: '1px solid #eee',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>User ID</th>
              <th style={thStyle}>Scopes</th>
              <th style={thStyle}>Created</th>
              <th style={thStyle}>Last Used</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '16px', textAlign: 'center' }}>
                  Loading keys…
                </td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
                  No MCP API keys yet.
                </td>
              </tr>
            ) : (
              keys.map((key) => {
                const revoked = !!key.revoked_at;
                const user = key.user_id ? users.find((u) => u.id === key.user_id) : null;
                return (
                  <tr key={key.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>{key.name}</td>
                    <td style={tdStyle}>
                      {key.user_id ? (
                        user ? (
                          <span title={key.user_id}>
                            {user.name || user.email}
                          </span>
                        ) : (
                          <span style={{ color: '#999', fontSize: '12px' }} title={key.user_id}>
                            {key.user_id.substring(0, 8)}...
                          </span>
                        )
                      ) : (
                        <span style={{ color: '#999', fontSize: '12px', fontStyle: 'italic' }}>
                          Not assigned
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>{(key.scopes || []).join(', ')}</td>
                    <td style={tdStyle}>{formatDate(key.created_at)}</td>
                    <td style={tdStyle}>{key.last_used_at ? formatDate(key.last_used_at) : '—'}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          background: revoked ? 'rgba(148, 163, 184, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                          color: revoked ? '#4b5563' : '#047857',
                        }}
                      >
                        {revoked ? 'Revoked' : 'Active'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {!revoked && (
                        <button
                          onClick={() => void handleRevoke(key.id)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            background: 'rgba(239, 68, 68, 0.05)',
                            color: '#b91c1c',
                            fontSize: '13px',
                            cursor: 'pointer',
                          }}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontFamily: 'var(--font-semi)',
  fontSize: '13px',
  color: '#4b5563',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: '13px',
  color: '#111827',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  } catch {
    return value;
  }
}


