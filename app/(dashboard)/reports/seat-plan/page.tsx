import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { SeatPlanAtAGlance } from "@/components/reports/seat-plan-at-a-glance"

export const metadata: Metadata = {
  title: "Seat Plan At a Glance · SMS Admin",
}

// Read-only, so any surface of "seat-plan-report" may see it. The filter
// lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function SeatPlanReportPage() {
  return (
    <RequireSurface resource="seat-plan-report" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <SeatPlanAtAGlance />
      </Suspense>
    </RequireSurface>
  )
}
