"use client"

import { InstituteDashboard } from "@/components/dashboard/institute-dashboard"
import { PlatformDashboard } from "@/components/dashboard/platform-dashboard"
import { isPlatformAdmin, useCurrentUser } from "@/lib/current-user"

// One /dashboard, two homes: the platform console for platform admins, an
// institute's dashboard for everyone working inside institutes.
export function DashboardView() {
  const user = useCurrentUser()
  return isPlatformAdmin(user) ? <PlatformDashboard /> : <InstituteDashboard />
}
