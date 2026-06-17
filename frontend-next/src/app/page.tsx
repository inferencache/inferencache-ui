import { Suspense } from "react";
import { DashboardClient } from "@/components/DashboardClient";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <DashboardClient />
    </Suspense>
  );
}
