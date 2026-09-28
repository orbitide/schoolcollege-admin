import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { PassFailReport } from "@/components/reports/pass-fail-report"

export const metadata: Metadata = {
  title: "Pass/Fail Report · SMS Admin",
}

// Read-only, so any surface of "pass-fail-report" may see it. The filter
// lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function PassFailReportPage() {
  return (
    <RequireSurface resource="pass-fail-report" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <PassFailReport />
      </Suspense>
    </RequireSurface>
  )
}
