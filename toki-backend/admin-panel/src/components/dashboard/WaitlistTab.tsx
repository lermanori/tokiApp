import { useState, useEffect, useMemo } from 'react';
import { adminApi } from '../../services/adminApi';
import WaitlistEntryModal from './WaitlistEntryModal';
import WaitlistStats from './WaitlistStats';
import EmailTemplatesPanel from '../waitlist/EmailTemplatesPanel';
import WaitlistEditModal from '../waitlist/WaitlistEditModal';

interface WaitlistEntry {
  id: string;
  email: string;
  phone: string | null;
  location: string | null;
  reason: string | null;
  platform: string | null;
  created_at: string;
  user_exists?: boolean;
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
    entries: WaitlistEntry[];
    pagination: Pagination;
  };
}

function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function WaitlistTab() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'email' | 'location' | 'user_exists'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<WaitlistEntry | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<{ mode: 'create' | 'edit'; entry?: WaitlistEntry } | null>(null);

  const queryParams = useMemo(() => ({
    page,
    limit,
    location: locationFilter || undefined,
    platform: platformFilter || undefined,
    sortBy,
    sortOrder
  }), [page, limit, locationFilter, platformFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadWaitlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  const loadWaitlist = async () => {
    setLoading(true);
    try {
      const resp = await adminApi.getWaitlist(queryParams) as ListResponse;
      let items = resp.data?.entries || [];
      if (search) {
        const s = search.toLowerCase();
        items = items.filter(e => e.email.toLowerCase().includes(s) || (e.location || '').toLowerCase().includes(s));
      }
      setEntries(items);
      setTotalPages(resp.data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to load waitlist:', error);
      setEntries([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (column: 'created_at' | 'email' | 'location' | 'user_exists') => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
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
        Waitlist Management
      </h2>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <WaitlistStats />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={()=>setTemplatesOpen(true)}>Email Templates</button>
          <button className="btn-primary" onClick={()=>setEditOpen({ mode: 'create' })}>New Entry</button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '16px', display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr 1fr 1fr auto' }}>
        <input
          className="input-glass"
          placeholder="Search email or location"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <input
          className="input-glass"
          placeholder="Filter by location"
          value={locationFilter}
          onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}
        />
        <select className="input-glass" value={platformFilter} onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}>
          <option value="">All platforms</option>
          <option value="ios">iOS</option>
          <option value="android">Android</option>
          <option value="web">Web</option>
        </select>
        <select className="input-glass" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
          <option value="created_at">Created</option>
          <option value="email">Email</option>
          <option value="location">Location</option>
        </select>
        <button className="btn-primary" onClick={() => setSortOrder(p => p === 'asc' ? 'desc' : 'asc')}>
          {sortOrder === 'asc' ? 'Asc' : 'Desc'}
        </button>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.6)' }}>
                <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleSort('email')}>Email</th>
                <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleSort('user_exists')}>User</th>
                <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleSort('location')}>Location</th>
                <th style={{ padding: '12px 16px' }}>Platform</th>
                <th style={{ padding: '12px 16px' }}>Phone</th>
                <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleSort('created_at')}>Created</th>
                <th style={{ padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24 }}>Loading...</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24, color: '#666' }}>No entries</td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: '12px 16px' }}>{e.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {e.user_exists ? (
                        <span style={{ color: '#10B981' }}>✓</span>
                      ) : (
                        <span style={{ color: '#EF4444' }}>✗</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{e.location || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>{e.platform || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>{e.phone || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>{formatDate(e.created_at)}</td>
                    <td style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                      <button className="btn-primary" onClick={() => setSelected(e)}>View</button>
                      <button className="btn-primary" onClick={() => setEditOpen({ mode: 'edit', entry: e })}>Edit</button>
                      <button className="btn-primary" onClick={async () => {
                        if (!confirm('Delete this waitlist entry?')) return;
                        try {
                          await adminApi.deleteWaitlistEntry(e.id);
                          await loadWaitlist();
                        } catch (err) {
                          alert('Failed to delete entry');
                        }
                      }} style={{ background: 'linear-gradient(135deg,#EF4444,#EC4899)' }}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
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
      </div>

      {/* Modal */}
      {selected && (
        <WaitlistEntryModal
          entry={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => {
            setSelected(null);
            loadWaitlist();
          }}
        />
      )}
      {editOpen && (
        <WaitlistEditModal
          initial={editOpen.mode === 'edit' ? editOpen.entry : undefined}
          onClose={() => setEditOpen(null)}
          onSaved={() => {
            setEditOpen(null);
            loadWaitlist();
          }}
        />
      )}
      {templatesOpen && (
        <EmailTemplatesPanel onClose={()=>setTemplatesOpen(false)} />
      )}
    </div>
  );
}

