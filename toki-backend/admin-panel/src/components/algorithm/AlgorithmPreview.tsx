interface Weights {
  w_hist: number;
  w_social: number;
  w_pop: number;
  w_time: number;
  w_geo: number;
  w_novel: number;
  w_pen: number;
}

export default function AlgorithmPreview({ w }: { w: Weights }) {
  const rows = [
    ['w_hist', w.w_hist, 'SimilarityToPastLiked(u,e)'],
    ['w_social', w.w_social, 'SocialBoost(u,e)'],
    ['w_pop', w.w_pop, 'Popularity(e)'],
    ['w_time', w.w_time, 'TimeDecay(e.start_time, now)'],
    ['w_geo', w.w_geo, 'Proximity(u.location, e.location)'],
    ['w_novel', w.w_novel, 'NoveltyBoost(u,e)'],
    ['w_pen', w.w_pen, 'DuplicateCategoryPenalty(u,e)'],
  ];

  return (
    <div className="glass-card" style={{ padding: 16 }}>
      <div style={{ marginBottom: 8, fontFamily: 'var(--font-semi)' }}>Formula</div>
      <div style={{ color: '#333', fontSize: 14, marginBottom: 12 }}>
        score(u,e) =
        {' '}
        w_hist·SimilarityToPastLiked + w_social·SocialBoost + w_pop·Popularity +
        {' '}
        w_time·TimeDecay + w_geo·Proximity + w_novel·NoveltyBoost − w_pen·DuplicateCategoryPenalty
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map(([key, val, desc]) => (
          <div key={key as string} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 60px', alignItems: 'center', gap: 12 }}>
            <div style={{ color: '#666' }}>{key}</div>
            <div style={{ height: 8, borderRadius: 9999, background: 'rgba(0,0,0,0.08)', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${(val as number) * 100}%`, background: 'linear-gradient(90deg,#8B5CF6,#EC4899)', borderRadius: 9999 }} />
            </div>
            <div style={{ textAlign: 'right', color: '#333' }}>{Math.round((val as number) * 100)}%</div>
            <div style={{ gridColumn: '1 / span 3', fontSize: 12, color: '#777' }}>{desc as string}</div>
          </div>
        ))}
      </div>
    </div>
  );
}



