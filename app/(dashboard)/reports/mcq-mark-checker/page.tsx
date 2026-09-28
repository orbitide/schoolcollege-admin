import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { McqMarkChecker } from "@/components/reports/mcq-mark-checker"

export const metadata: Metadata = {
  title: "MCQ Mark Checker · SMS Admin",
}

// Read-only, so any surface of "mcq-mark-checker" may see it. The filter
// lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function McqMarkCheckerPage() {
  return (
    <RequireSurface resource="mcq-mark-checker" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <McqMarkChecker />
      </Suspense>
    </RequireSurface>
  )
}
