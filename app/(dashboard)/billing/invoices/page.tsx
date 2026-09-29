import type { Metadata } from "next"

import { BillingInvoices } from "@/components/billing/billing-invoices"

export const metadata: Metadata = {
  title: "Invoices · Billing · SMS Admin",
}

export default function Page() {
  return <BillingInvoices />
}
