import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { AbsentSummary } from "@/components/reports/absent-summary"

export const metadata: Metadata = {
  title: "Absent Summary · SMS Admin",
}

// Read-only, so any surface of "absent-summary" may see it. The filter lives
// in the URL, which needs a Suspense boundary on this otherwise static page.
export default function AbsentSummaryPage() {
  return (
    <RequireSurface resource="absent-summary" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <AbsentSummary />
      </Suspense>
    </RequireSurface>
  )
}
