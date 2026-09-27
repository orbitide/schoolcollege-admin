import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ManageAdminList } from "@/components/institutes/academic/manage-admin-list"
import { basicSettingsItem } from "@/lib/basic-settings"

export async function generateMetadata({
  params,
}: PageProps<"/basic-settings/[segment]">): Promise<Metadata> {
  const { segment } = await params
  const item = basicSettingsItem(segment)
  return { title: `${item ? item.title : "Not found"} · SMS Admin` }
}

// Legacy "Manage X (Admin)": one setup record kind across all institutes.
export default async function ManageAdminPage({
  params,
}: PageProps<"/basic-settings/[segment]">) {
  const { segment } = await params
  const item = basicSettingsItem(segment)
  if (!item?.kind) notFound()

  return <ManageAdminList kind={item.kind} />
}
