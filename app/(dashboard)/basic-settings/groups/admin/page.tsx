import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Academic Group Manage Admin · SMS Admin",
}

// Academic Group ManageAdmin (not in legacy, where groups are a fixed enum).
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="groups" surface="Admin" />
    </Suspense>
  )
}
