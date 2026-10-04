import type { Metadata } from "next"
import { Suspense } from "react"

import { InstituteSurfaceList } from "@/components/institutes/institute-surface-list"

export const metadata: Metadata = {
  title: "Institute Manage Admin · SMS Admin",
}

// Legacy Institute/Manage (Institute Manage Admin).
export default function InstitutesAdminPage() {
  return (
    <Suspense>
      <InstituteSurfaceList surface="Admin" />
    </Suspense>
  )
}
