import { useState } from 'react';
import TokiPreviewCard from './TokiPreviewCard';
import TokiDetailsPreviewModal from './TokiDetailsPreviewModal';
import TokiPreviewEditModal from './TokiPreviewEditModal';

interface PreviewItem {
  index: number;
  toki: any;
  validation: {
    status: 'valid' | 'invalid';
    errors?: string[];
    warnings?: string[];
  };
}

interface BatchUploadPreviewProps {
  preview: {
    valid: PreviewItem[];
    invalid: PreviewItem[];
  };
  summary: {
    total: number;
    validCount: number;
    invalidCount: number;
  };
  onEdit: (index: number, updatedToki: any) => void;
  onCreate: () => void;
}

type FilterType = 'all' | 'valid' | 'invalid';

function StatCard({ title, value, gradient }: { title: string; value: number; gradient: string }) {
  return (
    <div className="glass-card" style={{ padding: 16 }}>
      <div style={{ color: '#666', fontSize: 13, marginBottom: 8, fontFamily: 'var(--font-medium)' }}>
        {title}
      </div>
      <div style={{
        fontSize: 28,
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

export default function BatchUploadPreview({ preview, summary, onEdit, onCreate }: BatchUploadPreviewProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedToki, setSelectedToki] = useState<PreviewItem | null>(null);
  const [editingToki, setEditingToki] = useState<PreviewItem | null>(null);

  const allItems = [...preview.valid, ...preview.invalid];

  const filteredItems = filter === 'all' 
    ? allItems 
    : filter === 'valid' 
    ? preview.valid 
    : preview.invalid;

  const handleEdit = (item: PreviewItem) => {
    setEditingToki(item);
  };

  const handleSaveEdit = (updatedToki: any) => {
    if (editingToki) {
      onEdit(editingToki.index, updatedToki);
      setEditingToki(null);
    }
  };

  return (
    <div>
      {/* Summary Stats */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 16, 
        marginBottom: 24 
      }}>
        <StatCard 
          title="Total" 
          value={summary.total} 
          gradient="linear-gradient(135deg,#8B5CF6,#EC4899)" 
        />
        <StatCard 
          title="Valid" 
          value={summary.validCount} 
          gradient="linear-gradient(135deg,#10B981,#4DC4AA)" 
        />
        <StatCard 
          title="Invalid" 
          value={summary.invalidCount} 
          gradient="linear-gradient(135deg,#EF4444,#EC4899)" 
        />
      </div>

      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 24,
        flexWrap: 'wrap'
      }}>
        <button
          className="btn-primary"
          onClick={() => setFilter('all')}
          style={{
            background: filter === 'all' ? 'var(--gradient-primary)' : 'rgba(139, 92, 246, 0.2)',
            color: filter === 'all' ? 'white' : '#8B5CF6'
          }}
        >
          All ({summary.total})
        </button>
        <button
          className="btn-primary"
          onClick={() => setFilter('valid')}
          style={{
            background: filter === 'valid' ? 'linear-gradient(135deg,#10B981,#4DC4AA)' : 'rgba(16, 185, 129, 0.2)',
            color: filter === 'valid' ? 'white' : '#10B981'
          }}
        >
          Valid ({summary.validCount})
        </button>
        <button
          className="btn-primary"
          onClick={() => setFilter('invalid')}
          style={{
            background: filter === 'invalid' ? 'linear-gradient(135deg,#EF4444,#EC4899)' : 'rgba(239, 68, 68, 0.2)',
            color: filter === 'invalid' ? 'white' : '#EF4444'
          }}
        >
          Invalid ({summary.invalidCount})
        </button>
      </div>

      {/* Grid of Toki Cards */}
      {filteredItems.length === 0 ? (
        <div style={{
          padding: 48,
          textAlign: 'center',
          color: '#6B7280'
        }}>
          No tokis to display
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20,
          marginBottom: 24
        }}>
          {filteredItems.map((item) => (
            <TokiPreviewCard
              key={item.index}
              toki={item.toki}
              validation={item.validation}
              onEdit={() => handleEdit(item)}
              onViewDetails={() => setSelectedToki(item)}
            />
          ))}
        </div>
      )}

      {/* Create Button */}
      {summary.validCount > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: 24,
          borderTop: '1px solid rgba(0,0,0,0.1)'
        }}>
          <button
            className="btn-primary"
            onClick={onCreate}
            style={{
              fontSize: 18,
              padding: '16px 32px',
              background: 'linear-gradient(135deg,#10B981,#4DC4AA)'
            }}
          >
            Create All Valid Tokis ({summary.validCount})
          </button>
        </div>
      )}

      {/* Details Modal */}
      {selectedToki && (
        <TokiDetailsPreviewModal
          toki={selectedToki.toki}
          validation={selectedToki.validation}
          onClose={() => setSelectedToki(null)}
          onEdit={() => {
            setSelectedToki(null);
            handleEdit(selectedToki);
          }}
        />
      )}

      {/* Edit Modal */}
      {editingToki && (
        <TokiPreviewEditModal
          toki={editingToki.toki}
          onClose={() => setEditingToki(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
