import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { ResultSummary } from "@/components/reports/result-summary"

export const metadata: Metadata = {
  title: "Result at a glance · SMS Admin",
}

// Read-only, so any surface of "result-summary" may see it. The filter lives
// in the URL, which needs a Suspense boundary on this otherwise static page.
export default function ResultSummaryPage() {
  return (
    <RequireSurface resource="result-summary" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <ResultSummary />
      </Suspense>
    </RequireSurface>
  )
}
