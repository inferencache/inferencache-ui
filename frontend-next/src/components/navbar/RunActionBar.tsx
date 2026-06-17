"use client";

import { memo } from "react";
import { AddApiKeyButton } from "@/components/navbar/AddApiKeyButton";
import { ClearCacheButton } from "@/components/navbar/ClearCacheButton";
import { RunTestButton } from "@/components/navbar/RunTestButton";

interface Props {
  running?:    boolean;
  keysReady?:  boolean;
  onOpenKeys?: () => void;
  onRun?:      () => void;
  onClear?:    () => void;
}

export const RunActionBar = memo(function RunActionBar({
  running = false,
  keysReady = false,
  onOpenKeys,
  onRun,
  onClear,
}: Props) {
  if (!onRun) return null;

  return (
    <>
      {!keysReady && onOpenKeys && <AddApiKeyButton onClick={onOpenKeys} />}
      {onClear && <ClearCacheButton onClick={onClear} disabled={running} />}
      <RunTestButton
        onClick={onRun}
        running={running}
        disabled={running || !keysReady}
      />
    </>
  );
});
