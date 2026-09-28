import type { Metadata } from "next"
import { Suspense } from "react"

import { ConfigurationSurface } from "@/components/configurations/configuration-surface"

export const metadata: Metadata = {
  title: "Dashboard Menus (Admin) · SMS Admin",
}

// Legacy DashboardMenu/ManageAdmin: the Admin surface.
export default function Page() {
  return (
    <Suspense>
      <ConfigurationSurface kind="dashboardMenus" surface="Admin" />
    </Suspense>
  )
}
