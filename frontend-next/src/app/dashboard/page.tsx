import { Suspense } from "react";
import { DashboardClient } from "@/components/DashboardClient";

export const metadata = {
  title: "inferencache · cache testing",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardClient />
    </Suspense>
  );
}
