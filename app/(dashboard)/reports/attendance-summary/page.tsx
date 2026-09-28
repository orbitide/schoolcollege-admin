import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { AttendanceSummaryPage } from "@/components/reports/attendance-summary"

export const metadata: Metadata = {
  title: "Attendance Summary · SMS Admin",
}

// Read-only, so any surface of "attendance-summary" may see it. The filter
// lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function AttendanceSummaryRoute() {
  return (
    <RequireSurface resource="attendance-summary" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <AttendanceSummaryPage />
      </Suspense>
    </RequireSurface>
  )
}
