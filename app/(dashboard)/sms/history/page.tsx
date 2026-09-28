import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { SmsHistory } from "@/components/sms/sms-history"

export const metadata: Metadata = {
  title: "SMS history · SMS Admin",
}

// Read-only, so any surface of "sms-history" may see it. The filters live in
// the URL, which needs a Suspense boundary on this otherwise static page.
export default function SmsHistoryPage() {
  return (
    <RequireSurface resource="sms-history" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <SmsHistory />
      </Suspense>
    </RequireSurface>
  )
}
