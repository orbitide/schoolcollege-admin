import type { Metadata } from "next"
import { Suspense } from "react"

import { ConfigurationSurface } from "@/components/configurations/configuration-surface"

export const metadata: Metadata = {
  title: "Dashboard Menu Groups · SMS Admin",
}

// Legacy DashboardMenuGroup/Manage: the Manage surface.
export default function Page() {
  return (
    <Suspense>
      <ConfigurationSurface kind="dashboardMenuGroups" surface="Manage" />
    </Suspense>
  )
}
