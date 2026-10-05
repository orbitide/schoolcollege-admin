import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Academic Class View · SMS Admin",
}

// Legacy AcademicClass/ManageView.
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="classes" surface="View" />
    </Suspense>
  )
}
