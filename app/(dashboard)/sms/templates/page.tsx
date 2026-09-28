import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { SmsTemplateList } from "@/components/sms/sms-template-list"

export const metadata: Metadata = {
  title: "SMS templates · SMS Admin",
}

// The Manage surface; /sms/templates/admin and /sms/templates/view sit
// beside it. The list reads its filters from the URL, which needs a Suspense
// boundary on this otherwise static page.
export default function SmsTemplatesPage() {
  return (
    <RequireSurface resource="sms-template" surface="Manage">
      <Suspense>
        <SmsTemplateList surface="Manage" />
      </Suspense>
    </RequireSurface>
  )
}
