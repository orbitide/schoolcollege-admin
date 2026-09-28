import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { DailyAttendanceReportPage } from "@/components/reports/daily-attendance-report"

export const metadata: Metadata = {
  title: "Daily Attendance Report · SMS Admin",
}

// Read-only, so any surface of "daily-attendance-report" may see it. The
// filter lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function DailyAttendancePage() {
  return (
    <RequireSurface resource="daily-attendance-report" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <DailyAttendanceReportPage />
      </Suspense>
    </RequireSurface>
  )
}
