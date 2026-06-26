"use client";

import { memo } from "react";
import { InfoTip, TitleWithTip } from "@/components/InfoTip";
import { TIPS } from "@/lib/tooltips";
import type { LiveStats } from "@/types";

interface Props { stats: LiveStats; }

export const HitBar = memo(function HitBar({ stats }: Props) {
  const { total, exact, semantic, generative, misses, hits } = stats;
  const exactPct = total > 0 ? (exact / total) * 100 : 0;
  const semPct   = total > 0 ? (semantic / total) * 100 : 0;
  const genPct   = total > 0 ? (generative / total) * 100 : 0;
  const missPct  = total > 0 ? (misses / total) * 100 : 100;
  const hitPct   = total > 0 ? Math.round((hits / total) * 100) : 0;

  return (
    <div className="card cp">
      <div className="card-hdr">
        <div className="card-ttl">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
          <TitleWithTip tip={TIPS.hitBreakdown} placement="bottom">
            Hit breakdown
          </TitleWithTip>
        </div>
        <div className="leg">
          <div className="leg-i">
            <div className="leg-d" style={{ background: "var(--green)" }} />
            Exact
            <InfoTip content={TIPS.exactLegend} placement="bottom" />
          </div>
          <div className="leg-i">
            <div className="leg-d" style={{ background: "var(--amber)" }} />
            Semantic
            <InfoTip content={TIPS.semanticLegend} placement="bottom" />
          </div>
          <div className="leg-i">
            <div className="leg-d" style={{ background: "#f59e0b" }} />
            Generative
            <InfoTip content="Adapted from a similar cached response via a cheap model." placement="bottom" />
          </div>
          <div className="leg-i">
            <div className="leg-d" style={{ background: "var(--b2)" }} />
            Miss
            <InfoTip content={TIPS.missLegend} placement="bottom" />
          </div>
        </div>
      </div>

      <div className="bar-track">
        {total === 0 ? (
          <div className="bseg bs-miss" style={{ width: "100%" }} />
        ) : (
          <>
            {exactPct > 0 && <div className="bseg bs-exact" style={{ width: `${exactPct}%` }} />}
            {semPct > 0 && <div className="bseg bs-sem" style={{ width: `${semPct}%` }} />}
            {genPct > 0 && <div className="bseg" style={{ width: `${genPct}%`, background: "#f59e0b" }} />}
            {missPct > 0 && <div className="bseg bs-miss" style={{ width: `${missPct}%` }} />}
          </>
        )}
      </div>

      <div className="bar-foot">
        <span>
          {total === 0
            ? "Run a suite to see breakdown"
            : `${exact} exact · ${semantic} semantic · ${generative} generative · ${misses} miss`}
        </span>
        <span>{total > 0 ? `${hitPct}% hit rate` : ""}</span>
      </div>
    </div>
  );
});
