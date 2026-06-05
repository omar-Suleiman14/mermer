"use client";

import dynamic from "next/dynamic";
import { IOSSpinner } from "@/components/ui/spinner";

const DashboardContent = dynamic(() => import("./dashboard-content"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[60vh]">
      <IOSSpinner className="w-8 h-8 text-[#007AFF]" />
    </div>
  ),
});

export default function DashboardPage() {
  return <DashboardContent />;
}
