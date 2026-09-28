import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { SubjectStatisticsReport } from "@/components/reports/subject-statistics"

export const metadata: Metadata = {
  title: "Subject Statistics · SMS Admin",
}

// Read-only, so any surface of "subject-statistics" may see it. The filter
// lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function SubjectStatisticsPage() {
  return (
    <RequireSurface resource="subject-statistics" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <SubjectStatisticsReport />
      </Suspense>
    </RequireSurface>
  )
}
