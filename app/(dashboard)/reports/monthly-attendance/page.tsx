import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { MonthlyAttendanceReport } from "@/components/reports/monthly-attendance-report"

export const metadata: Metadata = {
  title: "Monthly Attendance Report · SMS Admin",
}

// Read-only, so any surface of "monthly-attendance-report" may see it. The
// filter lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function MonthlyAttendancePage() {
  return (
    <RequireSurface resource="monthly-attendance-report" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <MonthlyAttendanceReport />
      </Suspense>
    </RequireSurface>
  )
}
