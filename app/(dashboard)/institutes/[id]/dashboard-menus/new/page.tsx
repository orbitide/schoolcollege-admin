import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Add dashboard menu · SMS Admin",
}

export default async function NewDashboardMenuPage({
  params,
}: PageProps<"/institutes/[id]/dashboard-menus/new">) {
  const { id } = await params

  return <RecordForm instituteId={Number(id)} kind="dashboardMenus" />
}
