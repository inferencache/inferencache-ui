"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface Point {
  threshold: string;
  hitRate: number;
  current: boolean;
}

interface Props {
  data: Point[];
  runThreshold: number;
}

const ttStyle = {
  background:   "var(--bg-surface)",
  border:       "1px solid var(--border-color)",
  borderRadius: "6px",
  fontSize:     "11px",
  color:        "var(--text)",
  padding:      "8px 12px",
  fontFamily:   "var(--font)",
};

export function ThresholdCurveChart({ data, runThreshold }: Props) {
  return (
    <ResponsiveContainer width="100%" height={100}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
        <XAxis dataKey="threshold" tick={{ fontSize: 9, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 9, fill: "var(--text-muted)" }} tickLine={false} axisLine={false}
          tickFormatter={(v) => `${v}%`}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={ttStyle}
          formatter={(v: number) => [`${v}%`, "hit rate"]}
          labelFormatter={(l) => `threshold ${l}`}
        />
        <ReferenceLine
          x={runThreshold.toFixed(2)}
          stroke="var(--primary)"
          strokeDasharray="3 3"
          label={{ value: "your setting", fontSize: 9, fill: "var(--primary)", position: "top" }}
        />
        <Line
          type="monotone" dataKey="hitRate"
          stroke="var(--green)" strokeWidth={1.5} dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
