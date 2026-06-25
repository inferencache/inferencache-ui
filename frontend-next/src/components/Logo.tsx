import { memo } from "react";
import clsx from "clsx";

interface Props {
  /** @deprecated kept for call-site compatibility; logo is always the brand PNG */
  variant?: "landing" | "app";
  size?: number;
  className?: string;
}

export const Logo = memo(function Logo({ size = 22, className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="inferencache"
      width={size}
      height={size}
      className={clsx("logo-image shrink-0", className)}
    />
  );
});
