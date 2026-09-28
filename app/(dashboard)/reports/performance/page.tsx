import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { PerformanceReportPage } from "@/components/reports/performance-report"

export const metadata: Metadata = {
  title: "Performance Report · SMS Admin",
}

// Read-only, so any surface of "performance-report" may see it. The filter
// lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function PerformancePage() {
  return (
    <RequireSurface resource="performance-report" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <PerformanceReportPage />
      </Suspense>
    </RequireSurface>
  )
}
