import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { FailedSummary } from "@/components/reports/failed-summary"

export const metadata: Metadata = {
  title: "Failed Summary · SMS Admin",
}

// Read-only, so any surface of "failed-summary" may see it. The filter lives
// in the URL, which needs a Suspense boundary on this otherwise static page.
export default function FailedSummaryPage() {
  return (
    <RequireSurface resource="failed-summary" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <FailedSummary />
      </Suspense>
    </RequireSurface>
  )
}
