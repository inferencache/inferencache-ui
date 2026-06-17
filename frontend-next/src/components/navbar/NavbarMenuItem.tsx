"use client";

import Link from "next/link";
import clsx from "clsx";
import { memo } from "react";
import type { NavItemDef } from "@/lib/dashboardNav";

interface Props {
  item:        NavItemDef;
  active:      boolean;
  href:        string;
  onSelect?:   () => void;
  onNavigate?: () => void;
  badge?:      React.ReactNode;
}

export const NavbarMenuItem = memo(function NavbarMenuItem({
  item, active, href, onSelect, onNavigate, badge,
}: Props) {
  const className = clsx("navbar-menu-item", active && "active");

  const inner = (
    <>
      {item.icon}
      <span className="navbar-menu-item-label">{item.label}</span>
      {badge}
    </>
  );

  if (onSelect) {
    return (
      <button type="button" className={className} onClick={onSelect}>
        {inner}
      </button>
    );
  }

  return (
    <Link href={href} className={className} onClick={onNavigate}>
      {inner}
    </Link>
  );
});
