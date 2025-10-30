import { useState } from 'react';
import UsersTable from '../users/UsersTable';
import TokisTable from '../tokis/TokisTable';

export default function DatabaseTab() {
  const [active, setActive] = useState<'users' | 'tokis'>('users');
  return (
    <div>
      <h2 style={{
        fontSize: '24px',
        fontFamily: 'var(--font-bold)',
        marginBottom: '16px',
        color: '#1C1C1C'
      }}>
        Database Management
      </h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Tab active={active === 'users'} onClick={() => setActive('users')} label="Users" />
        <Tab active={active === 'tokis'} onClick={() => setActive('tokis')} label="Tokis" />
      </div>

      {active === 'users' ? <UsersTable /> : <TokisTable />}
    </div>
  );
}

function Tab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string; }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 18px',
        border: 'none',
        background: active ? 'rgba(139,92,246,0.12)' : 'transparent',
        borderBottom: active ? '2px solid var(--primary-purple)' : '2px solid transparent',
        color: active ? 'var(--primary-purple)' : '#666',
        cursor: 'pointer',
        borderRadius: 8
      }}
    >
      {label}
    </button>
  );
}

