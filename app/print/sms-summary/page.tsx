import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { SmsSummaryPrint } from "@/components/sms/sms-summary-print"

export const metadata: Metadata = {
  title: "SMS report · SMS Admin",
}

// Outside the dashboard layout so only the report prints. Reads its filter
// from the URL, which needs a Suspense boundary on a static page.
export default function SmsSummaryPrintPage() {
  return (
    <RequireSurface resource="sms-summary" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <SmsSummaryPrint />
      </Suspense>
    </RequireSurface>
  )
}
