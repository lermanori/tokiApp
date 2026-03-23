import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { adminApi } from '../../services/adminApi';
import { Smartphone, Globe, Terminal, Activity, Users, Clock, LogIn, Plus } from 'lucide-react';
import UserActionsTimeline from './UserActionsTimeline';

interface TimeSeriesData {
  date: string;
  activeUsers: number;
  totalAccounts: number;
  uniqueLoginsToday: number;
  tokisCreatedToday: number;
}

interface PushPerformance {
  id: string;
  name: string;
  sent_count: number;
  open_count: number;
  open_rate: number;
}

interface Interaction {
  action: string;
  count: number;
}

const INTERACTION_COLORS = ['#8B5CF6', '#EC4899', '#3B82F6', '#F59E0B', '#10B981', '#6366F1'];
const PLATFORM_COLORS: { [key: string]: string } = {
  ios: '#8B5CF6',
  android: '#10B981',
  web: '#3B82F6',
  unknown: '#9CA3AF'
};

interface AnalyticsResponse {
  success: boolean;
  data?: {
    timeSeries: TimeSeriesData[];
    summary: {
      currentActiveUsers: number;
      onlineUsers: number;
      totalAccounts: number;
      uniqueLoginsToday: number;
      tokisCreatedToday: number;
      averageSessionLength: number;
    };
    platformStats: { platform: string; count: string }[];
  };
}

interface ChartCardProps {
  title: string;
  dataKey: keyof TimeSeriesData;
  color: string;
  timeSeries: TimeSeriesData[];
  loading: boolean;
  groupByHour: boolean;
}

export default function AnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([]);
  const [summary, setSummary] = useState({
    currentActiveUsers: 0,
    onlineUsers: 0,
    totalAccounts: 0,
    uniqueLoginsToday: 0,
    tokisCreatedToday: 0,
    averageSessionLength: 0
  });
  const [platformStats, setPlatformStats] = useState<any[]>([]);
  const [hours, setHours] = useState(720); // default 30 days
  const [error, setError] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | undefined>(undefined);
  const [pushPerformance, setPushPerformance] = useState<PushPerformance[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);

  // Determine if we're grouping by hour (<= 72 hours)
  const groupByHour = hours <= 72;

  useEffect(() => {
    loadAnalytics();
    loadActiveUsers();
    loadGlobalAnalytics();
  }, [hours]);

  const loadGlobalAnalytics = async () => {
    try {
      const [pushData, interactionData] = await Promise.all([
        adminApi.getPushPerformance(),
        adminApi.getInteractions()
      ]);
      setPushPerformance(pushData);
      setInteractions(interactionData);
    } catch (err) {
      console.error('Failed to fetch global analytics', err);
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await adminApi.getAnalytics(hours) as AnalyticsResponse;
      if (resp.data) {
        setTimeSeries(resp.data.timeSeries);
        setSummary(resp.data.summary);
        setPlatformStats(resp.data.platformStats || []);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics');
      setTimeSeries([]);
      setSummary({
        currentActiveUsers: 0,
        onlineUsers: 0,
        totalAccounts: 0,
        uniqueLoginsToday: 0,
        tokisCreatedToday: 0,
        averageSessionLength: 0
      });
      setPlatformStats([]);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveUsers = async () => {
    try {
      const resp = await adminApi.getActiveUsers({ limit: 30, days: 30 }) as any;
      if (resp.success) {
        setActiveUsers(resp.data);
      }
    } catch (e) {
      console.error('Failed to load active users', e);
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontFamily: 'var(--font-bold)',
          marginBottom: '0',
          color: '#1C1C1C'
        }}>
          Analytics Dashboard
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '14px', color: '#666' }}>Time Range:</label>
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--border-radius-md)',
              background: 'rgba(255, 255, 255, 0.8)',
              fontFamily: 'var(--font-medium)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value={1}>Last hour</option>
            <option value={12}>Last 12 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={72}>Last 3 days</option>
            <option value={168}>Last 7 days</option>
            <option value={336}>Last 14 days</option>
            <option value={720}>Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '16px',
        marginBottom: '16px'
      }}>
        <StatCard
          title="Online Now"
          value={loading ? '…' : summary.onlineUsers.toLocaleString()}
          gradient="linear-gradient(135deg, #10B981, #059669)"
          isLive
          icon={<Activity size={20} />}
        />
        <StatCard
          title="Avg Session Length"
          value={loading ? '…' : `${Math.floor(summary.averageSessionLength / 60)}m ${summary.averageSessionLength % 60}s`}
          gradient="linear-gradient(135deg, #3B82F6, #2563EB)"
          icon={<Clock size={20} />}
        />
        <StatCard
          title="Total Accounts"
          value={loading ? '…' : summary.totalAccounts.toLocaleString()}
          gradient="var(--gradient-secondary)"
          icon={<Users size={20} />}
        />
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <StatCard
          title="Active Users (7d)"
          value={loading ? '…' : summary.currentActiveUsers.toLocaleString()}
          gradient="var(--gradient-primary)"
          icon={<Activity size={20} />}
        />
        <StatCard
          title="Logins Today"
          value={loading ? '…' : summary.uniqueLoginsToday.toLocaleString()}
          gradient="linear-gradient(135deg, #F59E0B, #D97706)"
          icon={<LogIn size={20} />}
        />
        <StatCard
          title="Tokis Created Today"
          value={loading ? '…' : summary.tokisCreatedToday.toLocaleString()}
          gradient="linear-gradient(135deg, #EC4899, #DB2777)"
          icon={<Plus size={20} />}
        />
      </div>

      {/* Individual Charts in 2x2 Grid */}
      {error ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--border-radius-md)',
          color: '#EF4444'
        }}>
          {error}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '40px'
        }}>
          <ChartCard
            title="Active Users"
            dataKey="activeUsers"
            color="#8B5CF6"
            timeSeries={timeSeries}
            loading={loading}
            groupByHour={groupByHour}
          />
          <ChartCard
            title="Total Accounts"
            dataKey="totalAccounts"
            color="#EC4899"
            timeSeries={timeSeries}
            loading={loading}
            groupByHour={groupByHour}
          />
          <ChartCard
            title="Logins Today"
            dataKey="uniqueLoginsToday"
            color="#3B82F6"
            timeSeries={timeSeries}
            loading={loading}
            groupByHour={groupByHour}
          />
          <ChartCard
            title="Tokis Created"
            dataKey="tokisCreatedToday"
            color="#F59E0B"
            timeSeries={timeSeries}
            loading={loading}
            groupByHour={groupByHour}
          />
        </div>
      )}

      {/* Most Active Users Table */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{
            fontSize: '18px',
            fontFamily: 'var(--font-semi)',
            margin: 0,
            color: '#1C1C1C'
          }}>
            Most Active Users (Last 30 Days)
          </h3>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                fontSize: '14px',
                width: '240px',
                outline: 'none',
                fontFamily: 'var(--font-regular)'
              }}
            />
          </div>
        </div>
        <div style={{
          maxHeight: '450px',
          overflowY: 'auto',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.3)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F8FAFC', zIndex: 1, boxShadow: '0 1px 0 var(--glass-border)' }}>
                <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                  <th style={{ padding: '12px', color: '#666', fontSize: '13px' }}>USER</th>
                  <th style={{ padding: '12px', color: '#666', fontSize: '13px' }}>EMAIL</th>
                  <th style={{ padding: '12px', color: '#666', fontSize: '13px' }}>ACTIONS</th>
                  <th style={{ padding: '12px', color: '#666', fontSize: '13px' }}>PLATFORMS</th>
                  <th style={{ padding: '12px', color: '#666', fontSize: '13px' }}>LAST ACTIVE</th>
                  <th style={{ padding: '12px', color: '#666', fontSize: '13px' }}>DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers
                  .filter(u =>
                    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((user: any) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#E5E7EB', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px' }}>
                            {user.name?.charAt(0)}
                          </div>
                        )}
                        <span style={{ fontSize: '14px', fontFamily: 'var(--font-medium)' }}>{user.name}</span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>{user.email}</td>
                      <td style={{ padding: '12px', fontSize: '14px', fontFamily: 'var(--font-semi)' }}>{user.request_count}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {user.platforms?.map((p: string) => (
                            <div
                              key={p}
                              title={p.toUpperCase()}
                              style={{
                                padding: '4px',
                                borderRadius: '4px',
                                background: PLATFORM_COLORS[p] + '20',
                                color: PLATFORM_COLORS[p],
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              {p === 'ios' || p === 'android' ? <Smartphone size={14} /> :
                                p === 'web' ? <Globe size={14} /> : <Terminal size={14} />}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                        {new Date(user.last_active).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setSelectedUserName(user.name);
                          }}
                          className="btn-primary-sm"
                          style={{ fontSize: '12px' }}
                        >
                          Timeline
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Push Notification Performance */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: '20px' }}>
            Push Performance
          </h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '8px', color: '#666', fontSize: '12px' }}>NAME</th>
                  <th style={{ padding: '8px', color: '#666', fontSize: '12px' }}>SENT</th>
                  <th style={{ padding: '8px', color: '#666', fontSize: '12px' }}>OPEN RATE</th>
                </tr>
              </thead>
              <tbody>
                {pushPerformance.map((item: PushPerformance) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '8px', fontSize: '13px' }}>{item.name}</td>
                    <td style={{ padding: '8px', fontSize: '13px' }}>{item.sent_count}</td>
                    <td style={{ padding: '8px', fontSize: '13px' }}>
                      <span style={{ fontWeight: 'bold', color: item.open_rate > 20 ? '#10B981' : '#666' }}>
                        {item.open_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interaction Chart */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: '20px' }}>
            Screen Interactions (30d)
          </h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={interactions}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis
                  dataKey="action"
                  tickFormatter={(val) => val.split('_')[0]}
                  fontSize={10}
                />
                <YAxis fontSize={10} />
                <Tooltip
                  formatter={(value: number) => [value, 'Occurrences']}
                  labelFormatter={(name) => name.replace('_', ' ').toUpperCase()}
                />
                <Bar dataKey="count">
                  {interactions.map((_: Interaction, index: number) => (
                    <Cell key={`cell-${index}`} fill={INTERACTION_COLORS[index % INTERACTION_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-semi)', color: '#1C1C1C', marginBottom: '20px' }}>
            Device Distribution (30d)
          </h3>
          <div style={{ height: '300px', display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={platformStats}
                  dataKey="count"
                  nameKey="platform"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.platform} (${entry.count})`}
                >
                  {platformStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PLATFORM_COLORS[entry.platform] || PLATFORM_COLORS.unknown} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Timeline Overlay */}
      {selectedUserId && (
        <UserActionsTimeline
          userId={selectedUserId}
          userName={selectedUserName}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}

function ChartCard({ title, dataKey, color, timeSeries, loading, groupByHour }: ChartCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (groupByHour) {
      return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'var(--glass-blur)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--border-radius-md)',
      padding: '24px',
      boxShadow: 'var(--shadow-md)'
    }}>
      <h3 style={{
        fontSize: '18px',
        fontFamily: 'var(--font-semi)',
        marginBottom: '16px',
        color: '#1C1C1C'
      }}>
        {title}
      </h3>
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>
          Loading chart data...
        </div>
      ) : timeSeries.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeSeries} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#666"
              style={{ fontSize: '11px' }}
              angle={groupByHour ? -45 : 0}
              textAnchor={groupByHour ? 'end' : 'middle'}
              height={groupByHour ? 60 : 30}
            />
            <YAxis stroke="#666" style={{ fontSize: '11px' }} />
            <Tooltip
              contentStyle={{
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--border-radius-md)',
                padding: '8px 12px'
              }}
              labelFormatter={formatDate}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              name={title}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function StatCard({ title, value, gradient, isLive, icon }: { title: string; value: string; gradient: string; isLive?: boolean, icon: React.ReactNode }) {
  return (
    <div className="glass-card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
      {isLive && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10B981',
            boxShadow: '0 0 8px #10B981'
          }} />
          <span style={{ fontSize: '10px', color: '#10B981', fontFamily: 'var(--font-bold)', textTransform: 'uppercase' }}>Live</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ color: '#666', fontSize: '13px', fontFamily: 'var(--font-medium)' }}>
          {title}
        </div>
        <div style={{ color: '#9CA3AF' }}>{icon}</div>
      </div>

      <div style={{
        fontSize: '28px',
        fontFamily: 'var(--font-bold)',
        background: gradient,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        {value}
      </div>
    </div>
  );
}

