"use client";

import clsx from "clsx";
import { memo } from "react";
import { InfoTip } from "@/components/InfoTip";

export type MetricTone = "green" | "amber" | "purple";

interface Props {
  label: string;
  value: string;
  sub:   string;
  tone?: MetricTone;
  tip?:  string;
}

export const MetricCell = memo(function MetricCell({ label, value, sub, tone, tip }: Props) {
  return (
    <div className="mc">
      <div className="mc-label-row">
        <div className="mc-label">{label}</div>
        {tip && <InfoTip content={tip} placement="bottom" />}
      </div>
      <div className={clsx("mc-val", tone && `v-${tone}`)}>{value}</div>
      <div className="mc-sub">{sub}</div>
    </div>
  );
});
