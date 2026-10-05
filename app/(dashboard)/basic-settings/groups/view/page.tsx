import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Academic Group View · SMS Admin",
}

// Academic Group ManageView (not in legacy, where groups are a fixed enum).
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="groups" surface="View" />
    </Suspense>
  )
}
