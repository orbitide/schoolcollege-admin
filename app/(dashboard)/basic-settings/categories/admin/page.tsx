import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Student Category Manage Admin · SMS Admin",
}

// Legacy StudentCategory/ManageAdmin.
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="categories" surface="Admin" />
    </Suspense>
  )
}
