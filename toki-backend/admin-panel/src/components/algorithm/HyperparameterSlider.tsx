interface Props {
  label: string;
  value: number; // 0-100 percentage
  onChange: (val: number) => void;
  explanation?: string;
}

export default function HyperparameterSlider({ label, value, onChange, explanation }: Props) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-semi)', color: '#1C1C1C' }}>{label}</div>
        <div style={{ color: '#666' }}>{value}%</div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{
          appearance: 'none',
          height: 6,
          borderRadius: 9999,
          width: '100%',
          background: `linear-gradient(90deg, #8B5CF6 0%, #EC4899 ${value}%, rgba(0,0,0,0.08) ${value}%)`,
          outline: 'none'
        }}
      />
      {explanation && <div style={{ color: '#666', fontSize: 12 }}>{explanation}</div>}
    </div>
  );
}


