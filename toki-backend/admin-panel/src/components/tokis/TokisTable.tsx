import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../services/adminApi';
import TokiCreateModal from './TokiCreateModal';
import TokiEditModal from './TokiEditModal';
import DeleteConfirmDialog from '../shared/DeleteConfirmDialog';
import TokiParticipantsModal from './TokiParticipantsModal';

interface TokiRow {
  id: string;
  title: string;
  category: string | null;
  status: string | null;
  location: string | null;
  host_id: string;
  created_at: string;
}

interface Pagination { page: number; limit: number; total: number; totalPages: number; }
interface ListResponse { success: boolean; data?: { tokis: TokiRow[]; pagination: Pagination; }; }

function formatDate(iso?: string) { if (!iso) return ''; return new Date(iso).toLocaleString(); }

export default function TokisTable() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TokiRow | null>(null);
  const [deleting, setDeleting] = useState<TokiRow | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [participantsFor, setParticipantsFor] = useState<TokiRow | null>(null);
  const [rows, setRows] = useState<TokiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'title' | 'category' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const query = useMemo(() => ({
    page,
    limit,
    search: search || undefined,
    category: category || undefined,
    status: status || undefined,
    sortBy,
    sortOrder
  }), [page, limit, search, category, status, sortBy, sortOrder]);

  useEffect(() => { loadTokis(); /* eslint-disable-next-line */ }, [query]);

  const loadTokis = async () => {
    setLoading(true);
    try {
      const resp = await adminApi.getTokis(query) as ListResponse;
      setRows(resp.data?.tokis || []);
      setTotalPages(resp.data?.pagination?.totalPages || 1);
    } catch (e) {
      setRows([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (column: 'created_at' | 'title' | 'category' | 'status') => {
    if (sortBy === column) setSortOrder(p => p === 'asc' ? 'desc' : 'asc');
    else { setSortBy(column); setSortOrder('asc'); }
  };

  return (
    <div className="glass-card" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
        <div style={{ color: '#1C1C1C', fontFamily: 'var(--font-semi)' }}>Tokis</div>
        <button className="btn-primary" onClick={()=>setCreating(true)}>Create Toki</button>
      </div>
      {/* Filters */}
      <div style={{ padding: 16, display: 'grid', gap: 12, gridTemplateColumns: '1fr 200px 200px auto' }}>
        <input className="input-glass" placeholder="Search title, description, location" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <input className="input-glass" placeholder="Filter by category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} />
        <input className="input-glass" placeholder="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} />
        <button className="btn-primary" onClick={() => setSortOrder(p => p === 'asc' ? 'desc' : 'asc')}>{sortOrder === 'asc' ? 'Asc' : 'Desc'}</button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.6)' }}>
              <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleSort('title')}>Title</th>
              <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleSort('category')}>Category</th>
              <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleSort('status')}>Status</th>
              <th style={{ padding: '12px 16px' }}>Location</th>
              <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleSort('created_at')}>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 24 }}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 24, color: '#666' }}>No tokis</td></tr>
            ) : rows.map(t => (
              <tr key={t.id} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <td style={{ padding: '12px 16px' }}>{t.title}</td>
                <td style={{ padding: '12px 16px' }}><span style={{ padding: '4px 10px', borderRadius: 9999, background: 'linear-gradient(135deg,#8B5CF6,#EC4899)', color: 'white', fontSize: 12 }}>{t.category || '-'}</span></td>
                <td style={{ padding: '12px 16px' }}>{t.status || '-'}</td>
                <td style={{ padding: '12px 16px' }}>{t.location || '-'}</td>
                <td style={{ padding: '12px 16px' }}>{formatDate(t.created_at)}</td>
                <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                  <button className="btn-primary" onClick={()=>setParticipantsFor(t)} style={{ marginRight: 8, background: 'linear-gradient(135deg,#4DC4AA,#10B981)' }}>Participants</button>
                  <button className="btn-primary" onClick={()=>setEditing(t)} style={{ marginRight: 8 }}>Edit</button>
                  <button className="btn-primary" onClick={()=>setDeleting(t)} style={{ background: 'linear-gradient(135deg,#EF4444,#EC4899)' }}>Delete</button>
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
        <TokiCreateModal
          onClose={()=>setCreating(false)}
          onCreated={()=>{ setCreating(false); loadTokis(); }}
        />
      )}
      {editing && (
        <TokiEditModal
          toki={editing}
          onClose={()=>setEditing(null)}
          onSaved={()=>{ setEditing(null); loadTokis(); }}
        />
      )}
      {deleting && (
        <DeleteConfirmDialog
          title="Delete Toki"
          message={`Are you sure you want to delete "${deleting.title}"? This cannot be undone.`}
          onCancel={()=>setDeleting(null)}
          onConfirm={async ()=>{ setDeletingBusy(true); try { await adminApi.deleteToki(deleting.id); setDeleting(null); loadTokis(); } finally { setDeletingBusy(false); } }}
          loading={deletingBusy}
        />
      )}
      {participantsFor && (
        <TokiParticipantsModal tokiId={participantsFor.id} onClose={()=>setParticipantsFor(null)} />
      )}
    </div>
  );
}


