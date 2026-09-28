import { ManageAdminList } from "@/components/institutes/academic/manage-admin-list"
import { RequireSurface } from "@/components/require-surface"
import type { AccessSurface } from "@/lib/access"

// The record kinds under Configurations, each with its legacy ManageAdmin /
// Manage / ManageView pages at `url`, `url/admin` and `url/view`.
export const configurationKinds = {
  dashboardMenuGroups: {
    resource: "dashboard-menu-group",
    url: "/configurations/dashboard-menu-groups",
  },
  dashboardMenus: {
    resource: "dashboard-menu",
    url: "/configurations/dashboard-menus",
  },
} as const

// One surface of a Configurations record kind across every institute.
// Records are added and edited on the institute's own form.
export function ConfigurationSurface({
  kind,
  surface,
}: {
  kind: keyof typeof configurationKinds
  surface: AccessSurface
}) {
  const { resource, url } = configurationKinds[kind]
  return (
    <RequireSurface resource={resource} surface={surface}>
      <ManageAdminList kind={kind} resource={resource} baseUrl={url} surface={surface} />
    </RequireSurface>
  )
}
