import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit dashboard menu group · SMS Admin",
}

export default async function EditDashboardMenuGroupPage({
  params,
}: PageProps<"/institutes/[id]/dashboard-menu-groups/[recordId]/edit">) {
  const { id, recordId } = await params

  return (
    <RecordForm
      instituteId={Number(id)}
      kind="dashboardMenuGroups"
      recordId={Number(recordId)}
    />
  )
}
