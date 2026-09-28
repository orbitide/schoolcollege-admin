import { ManageAdminList } from "@/components/institutes/academic/manage-admin-list"
import { RequireSurface } from "@/components/require-surface"
import type { AccessSurface } from "@/lib/access"

export const DASHBOARD_MENU_GROUP_RESOURCE = "dashboard-menu-group"
export const DASHBOARD_MENU_GROUP_URL = "/configurations/dashboard-menu-groups"

// Legacy DashboardMenuGroup ManageAdmin / Manage / ManageView: the groups of
// every institute, as one surface. Records are added and edited on the
// institute's own form.
export function DashboardMenuGroupSurface({ surface }: { surface: AccessSurface }) {
  return (
    <RequireSurface resource={DASHBOARD_MENU_GROUP_RESOURCE} surface={surface}>
      <ManageAdminList
        kind="dashboardMenuGroups"
        resource={DASHBOARD_MENU_GROUP_RESOURCE}
        baseUrl={DASHBOARD_MENU_GROUP_URL}
        surface={surface}
      />
    </RequireSurface>
  )
}
