import type { Metadata } from "next"
import { Suspense } from "react"

import { DashboardMenuGroupSurface } from "@/components/configurations/dashboard-menu-group-surface"

export const metadata: Metadata = {
  title: "Dashboard Menu Groups · SMS Admin",
}

// Legacy "Dashboard Menu Group Manage": the Manage surface.
export default function Page() {
  return (
    <Suspense>
      <DashboardMenuGroupSurface surface="Manage" />
    </Suspense>
  )
}
