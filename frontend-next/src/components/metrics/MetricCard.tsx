"use client";

import clsx from "clsx";
import { memo, useEffect, useRef, useState } from "react";
import type { MetricTone } from "./MetricCell";

interface Props {
  label: string;
  value: string;
  sub: string;
  tone?: MetricTone;
}

function AnimatedValue({ value, tone }: { value: string; tone?: MetricTone }) {
  const prev = useRef(value);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setPop(true);
    const t = setTimeout(() => setPop(false), 380);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className={clsx("mc-val", tone && `v-${tone}`, pop && "stat-value-pop")}>
      {value}
    </div>
  );
}

export const MetricCard = memo(function MetricCard({ label, value, sub, tone }: Props) {
  return (
    <div className="ge-card metric-card-item">
      <div className="mc-label">{label}</div>
      <AnimatedValue value={value} tone={tone} />
      <div className="mc-sub">{sub}</div>
    </div>
  );
});
