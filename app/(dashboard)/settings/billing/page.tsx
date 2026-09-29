import type { Metadata } from "next"

import { PlatformBillingForm } from "@/components/settings/platform-billing-form"

export const metadata: Metadata = {
  title: "Billing Settings · SMS Admin",
}

export default function Page() {
  return <PlatformBillingForm />
}
