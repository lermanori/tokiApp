import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
    totalAccounts: 0,
    uniqueLoginsToday: 0,
    tokisCreatedToday: 0
  });
  const [hours, setHours] = useState(720); // default 30 days
  const [error, setError] = useState<string | null>(null);

  // Determine if we're grouping by hour (<= 72 hours)
  const groupByHour = hours <= 72;

  useEffect(() => {
    loadAnalytics();
  }, [hours]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await adminApi.getAnalytics(hours) as AnalyticsResponse;
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
          gap: '24px'
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
