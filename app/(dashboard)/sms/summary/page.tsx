import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { SmsSummary } from "@/components/sms/sms-summary"

export const metadata: Metadata = {
  title: "SMS summary · SMS Admin",
}

// Read-only, so any surface of "sms-summary" may see it. The filter lives in
// the URL, which needs a Suspense boundary on this otherwise static page.
export default function SmsSummaryPage() {
  return (
    <RequireSurface resource="sms-summary" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <SmsSummary />
      </Suspense>
    </RequireSurface>
  )
}
