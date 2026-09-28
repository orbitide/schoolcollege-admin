import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit dashboard menu · SMS Admin",
}

export default async function EditDashboardMenuPage({
  params,
}: PageProps<"/institutes/[id]/dashboard-menus/[recordId]/edit">) {
  const { id, recordId } = await params

  return (
    <RecordForm
      instituteId={Number(id)}
      kind="dashboardMenus"
      recordId={Number(recordId)}
    />
  )
}
