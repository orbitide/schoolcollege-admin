import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Academic Class Manage Admin · SMS Admin",
}

// Legacy AcademicClass/ManageAdmin.
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="classes" surface="Admin" />
    </Suspense>
  )
}
