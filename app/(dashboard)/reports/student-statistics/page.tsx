import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { StudentStatisticsReport } from "@/components/reports/student-statistics"

export const metadata: Metadata = {
  title: "Student Statistics · SMS Admin",
}

// Read-only, so any surface of "student-statistics" may see it. The filter
// lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function StudentStatisticsPage() {
  return (
    <RequireSurface resource="student-statistics" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <StudentStatisticsReport />
      </Suspense>
    </RequireSurface>
  )
}
