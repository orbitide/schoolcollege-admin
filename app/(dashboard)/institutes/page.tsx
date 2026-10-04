import type { Metadata } from "next"
import { Suspense } from "react"

import { InstituteSurfaceList } from "@/components/institutes/institute-surface-list"

export const metadata: Metadata = {
  title: "Institute Manage · SMS Admin",
}

// Legacy InstituteManage.
export default function InstitutesManagePage() {
  return (
    <Suspense>
      <InstituteSurfaceList surface="Manage" />
    </Suspense>
  )
}
