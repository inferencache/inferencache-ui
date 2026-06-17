"use client";

import Link from "next/link";
import clsx from "clsx";
import { memo } from "react";
import type { NavItemDef } from "@/lib/dashboardNav";

interface Props {
  item:      NavItemDef;
  active:    boolean;
  href:      string;
  onSelect?: () => void;
  badge?:    React.ReactNode;
}

export const AppNavLink = memo(function AppNavLink({
  item, active, href, onSelect, badge,
}: Props) {
  const className = clsx("app-navbar-link", active && "active");

  if (onSelect) {
    return (
      <button
        type="button"
        className={className}
        aria-current={active ? "page" : undefined}
        onClick={onSelect}
      >
        {item.icon}
        <span>{item.label}</span>
        {badge}
      </button>
    );
  }

  return (
    <Link href={href} className={className} aria-current={active ? "page" : undefined}>
      {item.icon}
      <span>{item.label}</span>
      {badge}
    </Link>
  );
});
