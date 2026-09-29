import type { Metadata } from "next"
import { Suspense } from "react"

import { InvoiceList } from "@/components/fees/invoice-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Manage Dues · SMS Admin",
}

// The page keeps its filters in the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <RequireSurface resource="fee-invoice" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <InvoiceList />
      </Suspense>
    </RequireSurface>
  )
}
