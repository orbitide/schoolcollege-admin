import type { Metadata } from "next"

import { BillingOverview } from "@/components/billing/billing-overview"

export const metadata: Metadata = {
  title: "Billing · SMS Admin",
}

export default function Page() {
  return <BillingOverview />
}
