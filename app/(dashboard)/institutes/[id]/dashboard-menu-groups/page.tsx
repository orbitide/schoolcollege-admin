import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Dashboard menu groups · SMS Admin",
}

export default async function DashboardMenuGroupsPage({
  params,
}: PageProps<"/institutes/[id]/dashboard-menu-groups">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="dashboardMenuGroups" />
}
