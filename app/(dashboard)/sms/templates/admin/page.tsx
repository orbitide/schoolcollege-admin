import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { SmsTemplateList } from "@/components/sms/sms-template-list"

export const metadata: Metadata = {
  title: "SMS templates (Admin) · SMS Admin",
}

export default function SmsTemplatesAdminPage() {
  return (
    <RequireSurface resource="sms-template" surface="Admin">
      <Suspense>
        <SmsTemplateList surface="Admin" />
      </Suspense>
    </RequireSurface>
  )
}
