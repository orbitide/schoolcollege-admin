import type { Metadata } from "next"

import { GeneralSettingsForm } from "@/components/settings/general-settings-form"

export const metadata: Metadata = {
  title: "General Settings · SMS Admin",
}

export default function Page() {
  return <GeneralSettingsForm />
}
