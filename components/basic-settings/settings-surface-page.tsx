import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ManageAdminList } from "@/components/institutes/academic/manage-admin-list"
import { RequireSurface } from "@/components/require-surface"
import type { AccessSurface } from "@/lib/access"
import { basicSettingsItem, basicSettingsResource } from "@/lib/basic-settings"

// Shared by the Manage page (/basic-settings/[segment]) and the Admin and
// View pages beside it: one setup record kind across all institutes.

export async function surfaceMetadata(
  params: Promise<{ segment: string }>,
  surface: AccessSurface
): Promise<Metadata> {
  const { segment } = await params
  const item = basicSettingsItem(segment)
  const suffix = surface === "Manage" ? "" : ` (${surface})`
  return { title: `${item ? `${item.title}${suffix}` : "Not found"} · SMS Admin` }
}

export async function SurfacePage({
  params,
  surface,
}: {
  params: Promise<{ segment: string }>
  surface: AccessSurface
}) {
  const { segment } = await params
  const item = basicSettingsItem(segment)
  if (!item?.kind) notFound()

  return (
    <RequireSurface resource={basicSettingsResource(segment)} surface={surface}>
      <ManageAdminList kind={item.kind} segment={segment} surface={surface} />
    </RequireSurface>
  )
}
