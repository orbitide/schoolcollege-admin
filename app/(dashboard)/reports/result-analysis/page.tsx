import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { ResultAnalysis } from "@/components/reports/result-analysis"

export const metadata: Metadata = {
  title: "Subject Result Analysis · SMS Admin",
}

// Read-only, so any surface of "result-analysis" may see it. The filter lives
// in the URL, which needs a Suspense boundary on this otherwise static page.
export default function ResultAnalysisPage() {
  return (
    <RequireSurface resource="result-analysis" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <ResultAnalysis />
      </Suspense>
    </RequireSurface>
  )
}
