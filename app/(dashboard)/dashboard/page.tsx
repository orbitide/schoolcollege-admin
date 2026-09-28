import type { Metadata } from "next"
import { Suspense } from "react"

import { DashboardView } from "@/components/dashboard/dashboard-view"

export const metadata: Metadata = {
  title: "Dashboard · SMS Admin",
}

// Platform admins get the platform dashboard, institute users their
// institute's; ?institute= picks the institute for a user with several.
export default function Page() {
  return (
    <Suspense>
      <DashboardView />
    </Suspense>
  )
}
