"use client";

import { useCallback, useState } from "react";
import clsx from "clsx";

const INSTALL_CMD = 'pip install "inferencache[embed,serve]"';

export function CopyInstallBlock() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <button
      type="button"
      onClick={copy}
      className={clsx(
        "landing-install-block",
        copied && "is-copied",
      )}
      aria-label="Copy install command"
    >
      <code className="pc-mono">{INSTALL_CMD}</code>
      <span className="landing-install-copy">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
