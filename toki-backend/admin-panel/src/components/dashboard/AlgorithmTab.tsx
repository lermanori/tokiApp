import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../services/adminApi';
import HyperparameterSlider from '../algorithm/HyperparameterSlider';
import AlgorithmPreview from '../algorithm/AlgorithmPreview';
import SaveConfirmationDialog from '../algorithm/SaveConfirmationDialog';

interface Weights {
  w_hist: number; w_social: number; w_pop: number; w_time: number; w_geo: number; w_novel: number; w_pen: number;
}

export default function AlgorithmTab() {
  const [_, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [w, setW] = useState<Weights>({ w_hist: 0.2, w_social: 0.15, w_pop: 0.2, w_time: 0.15, w_geo: 0.2, w_novel: 0.1, w_pen: 0.05 });

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const resp = await adminApi.getAlgorithm() as { success: boolean; data?: any };
      const data = resp.data || {};
      setW({
        w_hist: Number(data.w_hist ?? 0.2),
        w_social: Number(data.w_social ?? 0.15),
        w_pop: Number(data.w_pop ?? 0.2),
        w_time: Number(data.w_time ?? 0.15),
        w_geo: Number(data.w_geo ?? 0.2),
        w_novel: Number(data.w_novel ?? 0.1),
        w_pen: Number(data.w_pen ?? 0.05),
      });
    } finally { setLoading(false); }
  };

  const percentages = useMemo(() => ({
    w_hist: Math.round(w.w_hist * 100),
    w_social: Math.round(w.w_social * 100),
    w_pop: Math.round(w.w_pop * 100),
    w_time: Math.round(w.w_time * 100),
    w_geo: Math.round(w.w_geo * 100),
    w_novel: Math.round(w.w_novel * 100),
    w_pen: Math.round(w.w_pen * 100),
  }), [w]);

  const total = useMemo(() => Object.values(percentages).reduce((a, b) => a + (b as number), 0), [percentages]);
  const canSave = total === 100 && !saving;

  const setPct = (key: keyof Weights, pct: number) => {
    setW(prev => ({ ...prev, [key]: Math.max(0, Math.min(1, pct / 100)) }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.updateAlgorithm(w);
      setConfirm(false);
    } finally { setSaving(false); }
  };

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-bold)', marginBottom: '16px', color: '#1C1C1C' }}>
        Algorithm Hyperparameters
      </h2>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
        <div className="glass-card" style={{ padding: 16, display: 'grid', gap: 16 }}>
          <HyperparameterSlider label="w_hist" value={percentages.w_hist} onChange={(v)=>setPct('w_hist', v)} explanation="Similarity to user's past likes." />
          <HyperparameterSlider label="w_social" value={percentages.w_social} onChange={(v)=>setPct('w_social', v)} explanation="Boost when friends are going." />
          <HyperparameterSlider label="w_pop" value={percentages.w_pop} onChange={(v)=>setPct('w_pop', v)} explanation="Popularity of the event." />
          <HyperparameterSlider label="w_time" value={percentages.w_time} onChange={(v)=>setPct('w_time', v)} explanation="Recency/sooner events scoring higher." />
          <HyperparameterSlider label="w_geo" value={percentages.w_geo} onChange={(v)=>setPct('w_geo', v)} explanation="Proximity to user." />
          <HyperparameterSlider label="w_novel" value={percentages.w_novel} onChange={(v)=>setPct('w_novel', v)} explanation="Novelty/variety boost." />
          <HyperparameterSlider label="w_pen" value={percentages.w_pen} onChange={(v)=>setPct('w_pen', v)} explanation="Penalty for duplicate categories." />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: total === 100 ? '#10B981' : '#EF4444' }}>
            <div>Total</div>
            <div>{total}%</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="btn-primary" disabled={!canSave} onClick={() => setConfirm(true)}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <AlgorithmPreview w={w} />
      </div>

      {confirm && (
        <SaveConfirmationDialog onCancel={()=>setConfirm(false)} onConfirm={save} disabled={!canSave} />
      )}
    </div>
  );
}

