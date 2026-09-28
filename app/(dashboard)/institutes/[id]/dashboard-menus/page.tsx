import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Dashboard menus · SMS Admin",
}

export default async function DashboardMenusPage({
  params,
}: PageProps<"/institutes/[id]/dashboard-menus">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="dashboardMenus" />
}
