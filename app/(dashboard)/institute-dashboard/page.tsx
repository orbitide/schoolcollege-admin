import type { Metadata } from "next"
import { Suspense } from "react"

import { InstituteDashboard } from "@/components/dashboard/institute-dashboard"

export const metadata: Metadata = {
  title: "Institute Dashboard · SMS Admin",
}

// Any institute's dashboard, for platform admins (institute users get
// theirs at /dashboard). ?institute= picks the institute.
export default function Page() {
  return (
    <Suspense>
      <InstituteDashboard />
    </Suspense>
  )
}
