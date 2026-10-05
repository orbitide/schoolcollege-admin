import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Student Category Manage · SMS Admin",
}

// Legacy StudentCategory/Manage.
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="categories" surface="Manage" />
    </Suspense>
  )
}
