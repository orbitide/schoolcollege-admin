import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Academic Session Manage · SMS Admin",
}

// Legacy AcademicSession/Manage.
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="sessions" surface="Manage" />
    </Suspense>
  )
}
