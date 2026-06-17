"use client";

import { memo } from "react";

interface Props {
  href: string;
}

export const ChartExportLink = memo(function ChartExportLink({ href }: Props) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="top-btn hidden xl:inline-flex">
      Chart
    </a>
  );
});
