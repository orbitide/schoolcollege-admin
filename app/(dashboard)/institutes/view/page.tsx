import type { Metadata } from "next"
import { Suspense } from "react"

import { InstituteSurfaceList } from "@/components/institutes/institute-surface-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Institute View · SMS Admin",
}

// Legacy InstituteManageView.
export default function InstitutesViewPage() {
  return (
    <RequireSurface resource="settings.institutes" surface="View">
      <Suspense>
        <InstituteSurfaceList surface="View" />
      </Suspense>
    </RequireSurface>
  )
}
