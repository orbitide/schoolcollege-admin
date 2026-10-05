import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Student House Manage · SMS Admin",
}

// Legacy StudentHouse/Manage.
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="houses" surface="Manage" />
    </Suspense>
  )
}
