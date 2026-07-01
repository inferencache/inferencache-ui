"use client";

interface TierRow {
  label: string;
  value: number;
  color: string;
}

interface Props {
  exact: number;
  semantic: number;
  generative: number;
  totalCostAvoided: number;
  costIncurred: number;
  netSaved: number;
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="ds-bar-row">
      <span className="ds-bar-label">{label}</span>
      <div className="ds-bar-track">
        <div className="ds-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="ds-bar-count">${value.toFixed(2)}</span>
    </div>
  );
}

function fmt(n: number): string {
  return `$${n.toFixed(4)}`;
}

export function SavingsBreakdown({ exact, semantic, generative, totalCostAvoided, costIncurred, netSaved }: Props) {
  const maxVal = Math.max(exact, semantic, generative, 0.0001);

  const tiers: TierRow[] = [
    { label: "Exact match", value: exact,      color: "var(--green)" },
    { label: "Semantic",    value: semantic,   color: "var(--amber)" },
    { label: "Generative",  value: generative, color: "var(--purple)" },
  ];

  return (
    <div className="ds-card">
      <div className="ds-card-header">
        <span className="ds-card-title">Savings breakdown</span>
      </div>
      <div>
        {tiers.map((t) => (
          <BarRow key={t.label} label={t.label} value={t.value} max={maxVal} color={t.color} />
        ))}
      </div>
      <div className="ds-divider" />
      <div>
        <div className="ds-summary-row is-accent">
          <span>Total cost avoided</span>
          <span>{fmt(totalCostAvoided)}</span>
        </div>
        <div className="ds-summary-row is-muted">
          <span>Cost incurred (generative)</span>
          <span>{fmt(costIncurred)}</span>
        </div>
        <div className="ds-summary-row is-accent">
          <span>Net saved</span>
          <span>{fmt(netSaved)}</span>
        </div>
      </div>
    </div>
  );
}
