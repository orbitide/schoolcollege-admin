import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Academic Session View · SMS Admin",
}

// Legacy AcademicSession/ManageView.
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="sessions" surface="View" />
    </Suspense>
  )
}
