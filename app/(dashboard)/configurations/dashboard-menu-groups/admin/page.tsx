import type { Metadata } from "next"
import { Suspense } from "react"

import { ConfigurationSurface } from "@/components/configurations/configuration-surface"

export const metadata: Metadata = {
  title: "Dashboard Menu Groups (Admin) · SMS Admin",
}

// Legacy DashboardMenuGroup/ManageAdmin: the Admin surface.
export default function Page() {
  return (
    <Suspense>
      <ConfigurationSurface kind="dashboardMenuGroups" surface="Admin" />
    </Suspense>
  )
}
