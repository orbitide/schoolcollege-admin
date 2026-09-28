import type { Metadata } from "next"
import { Suspense } from "react"

import { ConfigurationSurface } from "@/components/configurations/configuration-surface"

export const metadata: Metadata = {
  title: "Dashboard Menus (View) · SMS Admin",
}

// Legacy DashboardMenu/ManageView: the View surface.
export default function Page() {
  return (
    <Suspense>
      <ConfigurationSurface kind="dashboardMenus" surface="View" />
    </Suspense>
  )
}
