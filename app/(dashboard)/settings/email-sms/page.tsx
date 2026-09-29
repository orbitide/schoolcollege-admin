import type { Metadata } from "next"

import { EmailSmsSettings } from "@/components/settings/email-sms-settings"

export const metadata: Metadata = {
  title: "Email & SMS Settings · SMS Admin",
}

export default function Page() {
  return <EmailSmsSettings />
}
