import { useEffect, useState, useMemo } from 'react';
import { adminApi } from '../../services/adminApi';
import UserCreateModal from './UserCreateModal';
import UserEditModal from './UserEditModal';
import DeleteConfirmDialog from '../shared/DeleteConfirmDialog';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  verified: boolean;
  location: string | null;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ListResponse {
  success: boolean;
  data?: {
    users: UserRow[];
    pagination: Pagination;
  };
}

function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function UsersTable() {
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [verified, setVerified] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'name' | 'email' | 'role' | 'verified'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const query = useMemo(() => ({
    page,
    limit,
    search: search || undefined,
    role: role || undefined,
    verified: verified === '' ? undefined : verified === 'true',
    sortBy,
    sortOrder
  }), [page, limit, search, role, verified, sortBy, sortOrder]);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const resp = await adminApi.getUsers(query) as ListResponse;
      setRows(resp.data?.users || []);
      setTotalPages(resp.data?.pagination?.totalPages || 1);
    } catch (e) {
      setRows([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (column: 'created_at' | 'name' | 'email' | 'role' | 'verified') => {
    if (sortBy === column) setSortOrder(p => p === 'asc' ? 'desc' : 'asc');
    else { setSortBy(column); setSortOrder('asc'); }
  };

  return (
    <div className="glass-card" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
        <div style={{ color: '#1C1C1C', fontFamily: 'var(--font-semi)' }}>Users</div>
        <button className="btn-primary" onClick={()=>setCreating(true)}>Create User</button>
      </div>
      {/* Filters */}
      <div style={{ padding: 16, display: 'grid', gap: 12, gridTemplateColumns: '1fr 200px 200px auto' }}>
        <input className="input-glass" placeholder="Search name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="input-glass" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select className="input-glass" value={verified} onChange={(e) => { setVerified(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <button className="btn-primary" onClick={() => setSortOrder(p => p === 'asc' ? 'desc' : 'asc')}>{sortOrder === 'asc' ? 'Asc' : 'Desc'}</button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.6)' }}>
              <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleSort('name')}>Name</th>
              <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleSort('email')}>Email</th>
              <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleSort('role')}>Role</th>
              <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleSort('verified')}>Verified</th>
              <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleSort('created_at')}>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 24 }}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 24, color: '#666' }}>No users</td></tr>
            ) : rows.map(u => (
              <tr key={u.id} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <td style={{ padding: '12px 16px' }}>{u.name}</td>
                <td style={{ padding: '12px 16px' }}>{u.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 9999,
                    background: u.role === 'admin' ? 'linear-gradient(135deg,#8B5CF6,#EC4899)' : 'linear-gradient(135deg,#4DC4AA,#10B981)',
                    color: 'white',
                    fontSize: 12
                  }}>{u.role}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>{u.verified ? <span style={{ color: '#10B981' }}>✓</span> : <span style={{ color: '#EF4444' }}>✗</span>}</td>
                <td style={{ padding: '12px 16px' }}>{formatDate(u.created_at)}</td>
                <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                  <button className="btn-primary" onClick={()=>setEditing(u)} style={{ marginRight: 8 }}>Edit</button>
                  <button className="btn-primary" onClick={()=>setDeleting(u)} style={{ background: 'linear-gradient(135deg,#EF4444,#EC4899)' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ color: '#666', fontSize: 14 }}>Page {page} of {totalPages}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
          <button className="btn-primary" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </div>

      {creating && (
        <UserCreateModal
          onClose={()=>setCreating(false)}
          onCreated={()=>{ setCreating(false); loadUsers(); }}
        />
      )}
      {editing && (
        <UserEditModal
          user={editing}
          onClose={()=>setEditing(null)}
          onSaved={()=>{ setEditing(null); loadUsers(); }}
        />
      )}
      {deleting && (
        <DeleteConfirmDialog
          title="Delete user"
          message={`Are you sure you want to delete ${deleting.email}? This cannot be undone.`}
          onCancel={()=>setDeleting(null)}
          onConfirm={async ()=>{ setDeletingBusy(true); try { await adminApi.deleteUser(deleting.id); setDeleting(null); loadUsers(); } finally { setDeletingBusy(false); } }}
          loading={deletingBusy}
        />
      )}
    </div>
  );
}


