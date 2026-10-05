import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Academic Year View · SMS Admin",
}

// Legacy AcademicYear/ManageView.
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="years" surface="View" />
    </Suspense>
  )
}
