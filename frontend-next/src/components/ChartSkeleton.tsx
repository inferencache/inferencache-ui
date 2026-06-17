export function ChartSkeleton({ height = 180 }: { height?: number }) {
  return (
    <div
      className="ge-empty animate-rise-in"
      style={{ height }}
      aria-busy="true"
      aria-label="Loading chart"
    >
      Loading chart…
    </div>
  );
}
