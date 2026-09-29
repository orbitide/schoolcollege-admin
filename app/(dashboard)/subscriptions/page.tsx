import type { Metadata } from "next"
import { Suspense } from "react"

import { RequirePlatform } from "@/components/require-platform"
import { SubscriptionsPage } from "@/components/subscriptions/subscriptions-page"

export const metadata: Metadata = {
  title: "Subscriptions · SMS Admin",
}

// ?tab=invoices opens the invoices.
export default function Page() {
  return (
    <RequirePlatform>
      <Suspense>
        <SubscriptionsPage />
      </Suspense>
    </RequirePlatform>
  )
}
