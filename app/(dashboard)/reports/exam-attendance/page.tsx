import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { ExamAttendanceReport } from "@/components/reports/exam-attendance-report"

export const metadata: Metadata = {
  title: "Exam Attendance Report · SMS Admin",
}

// Read-only, so any surface of "exam-attendance-report" may see it. The
// filter lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function ExamAttendanceReportPage() {
  return (
    <RequireSurface resource="exam-attendance-report" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <ExamAttendanceReport />
      </Suspense>
    </RequireSurface>
  )
}
