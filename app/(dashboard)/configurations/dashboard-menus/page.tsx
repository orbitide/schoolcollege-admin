import type { Metadata } from "next"
import { Suspense } from "react"

import { ConfigurationSurface } from "@/components/configurations/configuration-surface"

export const metadata: Metadata = {
  title: "Dashboard Menus · SMS Admin",
}

// Legacy DashboardMenu/Manage: the Manage surface.
export default function Page() {
  return (
    <Suspense>
      <ConfigurationSurface kind="dashboardMenus" surface="Manage" />
    </Suspense>
  )
}
