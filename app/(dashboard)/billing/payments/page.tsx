import type { Metadata } from "next"

import { BillingPayments } from "@/components/billing/billing-payments"

export const metadata: Metadata = {
  title: "Payment History · Billing · SMS Admin",
}

export default function Page() {
  return <BillingPayments />
}
