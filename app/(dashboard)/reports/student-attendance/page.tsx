import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { StudentAttendanceReportPage } from "@/components/reports/student-attendance-report"

export const metadata: Metadata = {
  title: "Student's Individual Attendance Report · SMS Admin",
}

// Read-only, so any surface of "student-attendance-report" may see it. The
// filter lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function StudentAttendancePage() {
  return (
    <RequireSurface resource="student-attendance-report" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <StudentAttendanceReportPage />
      </Suspense>
    </RequireSurface>
  )
}
