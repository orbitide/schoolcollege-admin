import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Student Category View · SMS Admin",
}

// Legacy StudentCategory/ManageView.
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="categories" surface="View" />
    </Suspense>
  )
}
