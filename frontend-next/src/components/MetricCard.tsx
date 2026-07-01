"use client";

interface HeroCardProps {
  value: string;
  sub?: string;
}

interface RegularCardProps {
  label: string;
  value: string;
  sub?: string;
}

export function HeroMetricCard({ value, sub }: HeroCardProps) {
  return (
    <div className="ds-metric-hero">
      <div className="ds-metric-hero-label">Money saved</div>
      <div className="ds-metric-hero-value">{value}</div>
      {sub && <div className="ds-metric-hero-sub">{sub}</div>}
    </div>
  );
}

export function MetricCard({ label, value, sub }: RegularCardProps) {
  return (
    <div className="ds-metric-card">
      <div className="ds-metric-label">{label}</div>
      <div className="ds-metric-value">{value}</div>
      {sub && <div className="ds-metric-sub">{sub}</div>}
    </div>
  );
}
