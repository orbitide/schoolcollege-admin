import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { ExamAttendanceSummary } from "@/components/reports/exam-attendance-summary"

export const metadata: Metadata = {
  title: "Exam Attendance Summary Report · SMS Admin",
}

// Read-only, so any surface of "exam-attendance-summary" may see it. The
// filter lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function ExamAttendanceSummaryPage() {
  return (
    <RequireSurface resource="exam-attendance-summary" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <ExamAttendanceSummary />
      </Suspense>
    </RequireSurface>
  )
}
