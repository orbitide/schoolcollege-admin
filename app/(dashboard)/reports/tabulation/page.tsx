import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { TabulationReport } from "@/components/reports/tabulation-report"

export const metadata: Metadata = {
  title: "Tabulation Sheet · SMS Admin",
}

// Read-only, so any surface of "tabulation" may see it. The filter lives in
// the URL, which needs a Suspense boundary on this otherwise static page.
export default function TabulationPage() {
  return (
    <RequireSurface resource="tabulation" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <TabulationReport />
      </Suspense>
    </RequireSurface>
  )
}
