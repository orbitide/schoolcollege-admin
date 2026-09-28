import type { Metadata } from "next"

import { RequireSurface } from "@/components/require-surface"
import { SendSms } from "@/components/sms/send-sms"

export const metadata: Metadata = {
  title: "Send SMS · SMS Admin",
}

// Sending needs the Manage (or Admin) surface of "sms-send"; viewers can't.
export default function SendSmsPage() {
  return (
    <RequireSurface resource="sms-send" surface={["Admin", "Manage"]}>
      <SendSms />
    </RequireSurface>
  )
}
