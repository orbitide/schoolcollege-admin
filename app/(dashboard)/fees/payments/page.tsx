import type { Metadata } from "next"
import { Suspense } from "react"

import { PaymentList } from "@/components/fees/payment-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Receipts · SMS Admin",
}

// The page keeps its filters in the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <RequireSurface resource="fee-payment" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <PaymentList />
      </Suspense>
    </RequireSurface>
  )
}
