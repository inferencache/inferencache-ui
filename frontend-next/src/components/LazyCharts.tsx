"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/ChartSkeleton";
import type { TimelinePoint } from "@/types";

const Charts = dynamic(
  () => import("@/components/Charts").then((m) => m.Charts),
  {
    ssr: false,
    loading: () => (
      <div className="ge-row ge-col-2 shrink-0">
        <div className="ge-card"><div className="card-body"><ChartSkeleton /></div></div>
        <div className="ge-card"><div className="card-body"><ChartSkeleton /></div></div>
      </div>
    ),
  },
);

export function LazyCharts({
  timeline,
  live = false,
}: {
  timeline: TimelinePoint[];
  live?: boolean;
}) {
  return <Charts timeline={timeline} live={live} />;
}
