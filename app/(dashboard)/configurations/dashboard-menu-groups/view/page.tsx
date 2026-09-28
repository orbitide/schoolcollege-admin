import type { Metadata } from "next"
import { Suspense } from "react"

import { DashboardMenuGroupSurface } from "@/components/configurations/dashboard-menu-group-surface"

export const metadata: Metadata = {
  title: "Dashboard Menu Groups (View) · SMS Admin",
}

// Legacy DashboardMenuGroup/ManageView: the View surface.
export default function Page() {
  return (
    <Suspense>
      <DashboardMenuGroupSurface surface="View" />
    </Suspense>
  )
}
