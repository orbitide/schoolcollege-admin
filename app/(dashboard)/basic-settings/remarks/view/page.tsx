import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Result Remarks View · SMS Admin",
}

// Legacy ResultRemarks/ManageView.
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="remarks" surface="View" />
    </Suspense>
  )
}
