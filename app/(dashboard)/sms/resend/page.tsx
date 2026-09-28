import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { SmsResend } from "@/components/sms/sms-resend"

export const metadata: Metadata = {
  title: "Re-send SMS · SMS Admin",
}

// Re-sending spends SMS balance, so it needs the Manage (or Admin) surface.
// The filters live in the URL, which needs a Suspense boundary.
export default function SmsResendPage() {
  return (
    <RequireSurface resource="sms-resend" surface={["Admin", "Manage"]}>
      <Suspense>
        <SmsResend />
      </Suspense>
    </RequireSurface>
  )
}
