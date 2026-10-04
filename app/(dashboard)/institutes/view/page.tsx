import type { Metadata } from "next"
import { Suspense } from "react"

import { InstituteSurfaceList } from "@/components/institutes/institute-surface-list"

export const metadata: Metadata = {
  title: "Institute View · SMS Admin",
}

// Legacy InstituteManageView.
export default function InstitutesViewPage() {
  return (
    <Suspense>
      <InstituteSurfaceList surface="View" />
    </Suspense>
  )
}
