"use client";

import { memo, useMemo } from "react";
import clsx from "clsx";
import {
  BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { DotProps } from "recharts";
import type { TimelinePoint } from "@/types";
import { fmtCost } from "@/lib/api";
import { useLivePulse } from "@/lib/useLivePulse";

type LineDotProps = DotProps & { index?: number };

interface Props {
  timeline: TimelinePoint[];
  live?: boolean;
}

const TT = {
  backgroundColor: "#181d27",
  borderColor: "rgba(255,255,255,.08)",
  borderWidth: 1,
  titleColor: "#7a8099",
  bodyColor: "#f0f2f7",
  padding: 8,
  cornerRadius: 6,
  fontSize: 11,
  fontFamily: "var(--mono)",
};

const AXIS = {
  tick: { fontSize: 9, fill: "#3d4459", fontFamily: "var(--mono)" },
  tickLine: false,
  axisLine: false,
};

const CHART_MOTION = {
  isAnimationActive: true,
  animationDuration: 2200,
  animationEasing: "ease-out" as const,
};

function Empty() {
  return (
    <div className="empty" style={{ height: 112 }}>
      <p>No chart data yet — run a test suite first</p>
    </div>
  );
}

function LiveDot({
  cx, cy, index, color, count, live,
}: LineDotProps & { color: string; count: number; live: boolean }) {
  if (cx == null || cy == null) return null;
  const isLatest = index === count - 1;
  const r = isLatest ? 3.5 : 2;
  return (
    <g transform={`translate(${cx},${cy})`}>
      <circle
        r={r}
        fill={color}
        className={isLatest && live ? "chart-dot-live" : undefined}
      />
    </g>
  );
}

export const Charts = memo(function Charts({ timeline, live = false }: Props) {
  const has = timeline.length > 0;
  const chartData = useMemo(() => timeline, [timeline]);
  const stepPulse = useLivePulse(timeline.length, live);

  const missDot = (props: LineDotProps) => (
    <LiveDot {...props} color="#f06a6a" count={chartData.length} live={live} />
  );
  const hitDot = (props: LineDotProps) => (
    <LiveDot {...props} color="#10d9a0" count={chartData.length} live={live} />
  );

  const wrapCls = clsx("chart-wrap", has && "chart-wrap-live", stepPulse && "chart-step-pulse");

  return (
    <div className="charts-row">
      <div className="card cp">
        <div className="card-hdr">
          <div className="card-ttl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Latency per call
          </div>
          <div className="leg">
            <div className="leg-i"><div className="leg-d" style={{ background: "var(--green)" }} />Cache</div>
            <div className="leg-i"><div className="leg-d" style={{ background: "var(--red)" }} />API</div>
          </div>
        </div>
        <div className={wrapCls}>
          {!has ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="idx" hide />
                <YAxis {...AXIS} tickFormatter={(v) => `${v}ms`} width={36} />
                <Tooltip contentStyle={TT} labelFormatter={(v) => `#${Number(v) + 1}`}
                  formatter={(v: number, n: string) => [`${v?.toFixed(0) ?? "—"}ms`, n]} />
                <Line
                  type="monotone"
                  dataKey="miss_ms"
                  name="API"
                  stroke="#f06a6a"
                  strokeWidth={1.5}
                  dot={missDot}
                  connectNulls
                  {...CHART_MOTION}
                />
                <Line
                  type="monotone"
                  dataKey="hit_ms"
                  name="Cache"
                  stroke="#10d9a0"
                  strokeWidth={1.5}
                  dot={hitDot}
                  connectNulls
                  {...CHART_MOTION}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card cp">
        <div className="card-hdr">
          <div className="card-ttl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Cost per call
          </div>
          <div className="leg">
            <div className="leg-i"><div className="leg-d" style={{ background: "var(--green)" }} />$0 cached</div>
            <div className="leg-i"><div className="leg-d" style={{ background: "var(--action)" }} />Billed</div>
          </div>
        </div>
        <div className={wrapCls}>
          {!has ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                <XAxis dataKey="idx" hide />
                <YAxis {...AXIS} tickFormatter={(v) => v === 0 ? "$0" : `$${v.toFixed(5)}`} width={48} />
                <Tooltip contentStyle={TT} labelFormatter={(v) => `#${Number(v) + 1}`}
                  formatter={(v: number) => [fmtCost(v), "cost"]} />
                <Bar dataKey="cost" radius={[2, 2, 0, 0]} {...CHART_MOTION}>
                  {chartData.map((p, i) => (
                    <Cell
                      key={i}
                      fill={p.cost > 0 ? "rgba(249,115,22,.75)" : "rgba(16,217,160,.5)"}
                      className={
                        live && i === chartData.length - 1 ? "chart-bar-live" : undefined
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
});
