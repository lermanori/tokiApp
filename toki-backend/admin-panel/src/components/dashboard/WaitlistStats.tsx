import { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';

interface StatsResponse {
  success: boolean;
  data?: {
    total: number;
    byLocation: { location: string | null; count: string }[];
    byPlatform: { platform: string | null; count: string }[];
    timeSeries: { date: string; count: string }[];
  };
}

export default function WaitlistStats() {
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [topLocation, setTopLocation] = useState<string>('—');
  const [topPlatform, setTopPlatform] = useState<string>('—');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const resp = await adminApi.getWaitlistStats() as StatsResponse;
      const data = resp.data;
      if (data) {
        setTotal(Number(data.total || 0));
        setTopLocation((data.byLocation?.[0]?.location) || '—');
        setTopPlatform((data.byPlatform?.[0]?.platform) || '—');
      }
    } catch (e) {
      setTotal(0);
      setTopLocation('—');
      setTopPlatform('—');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 16 }}>
      <StatCard title="Total Signups" value={loading ? '…' : String(total)} gradient="var(--gradient-primary)" />
      <StatCard title="Top Location" value={loading ? '…' : topLocation} gradient="var(--gradient-secondary)" />
      <StatCard title="Top Platform" value={loading ? '…' : topPlatform} gradient="linear-gradient(135deg,#F59E0B,#EC4899)" />
    </div>
  );
}

function StatCard({ title, value, gradient }: { title: string; value: string; gradient: string; }) {
  return (
    <div className="glass-card" style={{ padding: 16 }}>
      <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 24, fontFamily: 'var(--font-bold)', background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{value}</div>
    </div>
  );
}
