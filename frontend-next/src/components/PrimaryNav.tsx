"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const LINKS = [
  { href: "/", label: "Cache testing" },
  { href: "/db", label: "Saved runs", match: (p: string) => p.startsWith("/db") },
] as const;

export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-5 min-w-0">
      <Link href="/" className="topbar-brand shrink-0">
        <span className="topbar-brand-icon" aria-hidden>P</span>
        <span className="topbar-brand-name">promptcache</span>
      </Link>

      <nav className="topbar-nav" aria-label="Primary">
        {LINKS.map(({ href, label, ...rest }) => {
          const active =
            "match" in rest && rest.match
              ? rest.match(pathname)
              : pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx("topbar-nav-link", active && "active")}
              aria-current={active ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
