import type { Metadata } from "next"
import { Suspense } from "react"

import { DashboardMenuGroupSurface } from "@/components/configurations/dashboard-menu-group-surface"

export const metadata: Metadata = {
  title: "Dashboard Menu Groups (Admin) · SMS Admin",
}

// Legacy DashboardMenuGroup/ManageAdmin: the Admin surface.
export default function Page() {
  return (
    <Suspense>
      <DashboardMenuGroupSurface surface="Admin" />
    </Suspense>
  )
}
