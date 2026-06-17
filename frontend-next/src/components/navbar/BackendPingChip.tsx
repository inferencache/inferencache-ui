"use client";

import clsx from "clsx";
import { memo } from "react";

interface Props {
  host: string;
  ms:   number | null;
  ok:   boolean;
}

export const BackendPingChip = memo(function BackendPingChip({ host, ms, ok }: Props) {
  return (
    <div className="ping-chip hidden lg:flex">
      <span className={clsx("sidebar-live-dot", ok && "is-live", !ok && "is-offline")} />
      {host}
      {ms !== null && (
        <>
          <span className="ping-sep">·</span>
          <span>{ms}ms</span>
        </>
      )}
    </div>
  );
});
