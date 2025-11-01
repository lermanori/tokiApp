import { useState } from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { LogOut, Users, Mail, Sliders } from 'lucide-react';
import WaitlistTab from './WaitlistTab';
import DatabaseTab from './DatabaseTab';
import AlgorithmTab from './AlgorithmTab';

export default function Dashboard() {
  const { user, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<'waitlist' | 'database' | 'algorithm'>('waitlist');

  const handleLogout = () => {
    logout();
    window.location.href = '/admin/login';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--gradient-hero)'
    }}>
      {/* Header */}
      <header style={{
        background: 'var(--gradient-card)',
        backdropFilter: 'var(--glass-blur)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '20px 40px',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              fontSize: '24px',
              fontFamily: 'var(--font-bold)',
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '4px'
            }}>
              Toki Admin Panel
            </h1>
            <p style={{
              color: '#666',
              fontSize: '14px'
            }}>
              Welcome back, {user?.name}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--border-radius-md)',
              color: '#EF4444',
              fontFamily: 'var(--font-medium)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.5)',
        backdropFilter: 'var(--glass-blur)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '0 40px'
      }}>
        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          <TabButton
            active={activeTab === 'waitlist'}
            onClick={() => setActiveTab('waitlist')}
            icon={<Mail size={18} />}
            label="Waitlist"
          />
          <TabButton
            active={activeTab === 'database'}
            onClick={() => setActiveTab('database')}
            icon={<Users size={18} />}
            label="Database"
          />
          <TabButton
            active={activeTab === 'algorithm'}
            onClick={() => setActiveTab('algorithm')}
            icon={<Sliders size={18} />}
            label="Algorithm"
          />
        </div>
      </div>

      {/* Content */}
      <div style={{
        padding: '40px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {activeTab === 'waitlist' && <WaitlistTab />}
        {activeTab === 'database' && <DatabaseTab />}
        {activeTab === 'algorithm' && <AlgorithmTab />}
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        border: 'none',
        background: 'transparent',
        borderBottom: active ? '2px solid var(--primary-purple)' : '2px solid transparent',
        color: active ? 'var(--primary-purple)' : '#666',
        fontFamily: active ? 'var(--font-semi)' : 'var(--font-medium)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontSize: '15px'
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'var(--primary-purple-dark)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = '#666';
        }
      }}
    >
      {icon}
      {label}
    </button>
  );
}


