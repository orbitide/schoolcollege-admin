import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Shift View · SMS Admin",
}

// Legacy Shift/ManageView.
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="shifts" surface="View" />
    </Suspense>
  )
}
