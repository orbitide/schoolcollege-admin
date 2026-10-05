import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Academic Session Manage Admin · SMS Admin",
}

// Legacy AcademicSession/ManageAdmin.
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="sessions" surface="Admin" />
    </Suspense>
  )
}
