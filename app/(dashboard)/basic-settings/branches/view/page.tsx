import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Branch View · SMS Admin",
}

// Legacy Branch/ManageView.
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="branches" surface="View" />
    </Suspense>
  )
}
