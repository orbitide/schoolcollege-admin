import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Academic Year Manage · SMS Admin",
}

// Legacy AcademicYear/Manage.
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="years" surface="Manage" />
    </Suspense>
  )
}
