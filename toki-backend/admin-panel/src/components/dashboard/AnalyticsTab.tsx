import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { adminApi } from '../../services/adminApi';

interface TimeSeriesData {
  date: string;
  activeUsers: number;
  totalAccounts: number;
  uniqueLoginsToday: number;
  tokisCreatedToday: number;
}

interface AnalyticsResponse {
  success: boolean;
  data?: {
    timeSeries: TimeSeriesData[];
    summary: {
      currentActiveUsers: number;
      totalAccounts: number;
      uniqueLoginsToday: number;
      tokisCreatedToday: number;
    };
  };
}

export default function AnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([]);
  const [summary, setSummary] = useState({
    currentActiveUsers: 0,
    totalAccounts: 0,
    uniqueLoginsToday: 0,
    tokisCreatedToday: 0
  });
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await adminApi.getAnalytics(days) as AnalyticsResponse;
      if (resp.data) {
        setTimeSeries(resp.data.timeSeries);
        setSummary(resp.data.summary);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics');
      setTimeSeries([]);
      setSummary({
        currentActiveUsers: 0,
        totalAccounts: 0,
        uniqueLoginsToday: 0,
        tokisCreatedToday: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
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
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <StatCard
          title="Active Users (7d)"
          value={loading ? '…' : summary.currentActiveUsers.toLocaleString()}
          gradient="var(--gradient-primary)"
        />
        <StatCard
          title="Total Accounts"
          value={loading ? '…' : summary.totalAccounts.toLocaleString()}
          gradient="var(--gradient-secondary)"
        />
        <StatCard
          title="Logins Today"
          value={loading ? '…' : summary.uniqueLoginsToday.toLocaleString()}
          gradient="linear-gradient(135deg, #10B981, #3B82F6)"
        />
        <StatCard
          title="Tokis Created Today"
          value={loading ? '…' : summary.tokisCreatedToday.toLocaleString()}
          gradient="linear-gradient(135deg, #F59E0B, #EC4899)"
        />
      </div>

      {/* Chart */}
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
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--border-radius-md)',
          padding: '24px',
          boxShadow: 'var(--shadow-md)'
        }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>
              Loading chart data...
            </div>
          ) : timeSeries.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>
              No data available for the selected time range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={timeSeries} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#666"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: '8px 12px'
                  }}
                  labelFormatter={formatDate}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={false}
                  name="Active Users"
                />
                <Line
                  type="monotone"
                  dataKey="totalAccounts"
                  stroke="#EC4899"
                  strokeWidth={2}
                  dot={false}
                  name="Total Accounts"
                />
                <Line
                  type="monotone"
                  dataKey="uniqueLoginsToday"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                  name="Logins Today"
                />
                <Line
                  type="monotone"
                  dataKey="tokisCreatedToday"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                  name="Tokis Created"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, gradient }: { title: string; value: string; gradient: string; }) {
  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <div style={{ color: '#666', fontSize: '13px', marginBottom: '8px', fontFamily: 'var(--font-medium)' }}>
        {title}
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

