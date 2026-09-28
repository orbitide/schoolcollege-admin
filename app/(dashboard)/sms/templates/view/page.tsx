import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { SmsTemplateList } from "@/components/sms/sms-template-list"

export const metadata: Metadata = {
  title: "SMS templates (View) · SMS Admin",
}

export default function SmsTemplatesViewPage() {
  return (
    <RequireSurface resource="sms-template" surface="View">
      <Suspense>
        <SmsTemplateList surface="View" />
      </Suspense>
    </RequireSurface>
  )
}
