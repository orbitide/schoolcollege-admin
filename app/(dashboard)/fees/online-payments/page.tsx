import type { Metadata } from "next"
import { Suspense } from "react"

import { OnlinePaymentList } from "@/components/fees/online-payment-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Online Payments · SMS Admin",
}

// The page keeps its filters in the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <RequireSurface resource="online-payment" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <OnlinePaymentList />
      </Suspense>
    </RequireSurface>
  )
}
