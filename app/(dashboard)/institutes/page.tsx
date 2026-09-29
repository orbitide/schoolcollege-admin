import type { Metadata } from "next"
import { Suspense } from "react"

import { InstituteSurfaceList } from "@/components/institutes/institute-surface-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Institute Manage · SMS Admin",
}

// Legacy InstituteManage.
export default function InstitutesManagePage() {
  return (
    <RequireSurface resource="settings.institutes" surface="Manage">
      <Suspense>
        <InstituteSurfaceList surface="Manage" />
      </Suspense>
    </RequireSurface>
  )
}
