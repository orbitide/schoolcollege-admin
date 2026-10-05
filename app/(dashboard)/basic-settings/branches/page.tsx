import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Branch Manage · SMS Admin",
}

// Legacy Branch/Manage.
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="branches" surface="Manage" />
    </Suspense>
  )
}
