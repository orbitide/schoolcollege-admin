import type { Metadata } from "next"
import { Suspense } from "react"

import { InstituteSurfaceList } from "@/components/institutes/institute-surface-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Institute Manage Admin · SMS Admin",
}

// Legacy Institute/Manage (Institute Manage Admin).
export default function InstitutesAdminPage() {
  return (
    <RequireSurface resource="settings.institutes" surface="Admin">
      <Suspense>
        <InstituteSurfaceList surface="Admin" />
      </Suspense>
    </RequireSurface>
  )
}
