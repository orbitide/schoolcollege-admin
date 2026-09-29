import { Suspense } from "react"

import { BillingHeader } from "@/components/billing/billing-shell"
import { RequireSurface } from "@/components/require-surface"

// The user menu's Billing: Overview, Invoices and Payments. The pages read
// the picked institute from the URL, which needs Suspense boundaries.
export default function BillingLayout({ children }: LayoutProps<"/billing">) {
  return (
    <RequireSurface resource="institute-billing" surface={["Manage", "View"]}>
      <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
        <Suspense>
          <BillingHeader />
        </Suspense>
        <Suspense>{children}</Suspense>
      </div>
    </RequireSurface>
  )
}
