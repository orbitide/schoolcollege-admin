import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit group · SMS Admin",
}

export default async function EditGroupsPage({
  params,
}: PageProps<"/institutes/[id]/groups/[recordId]/edit">) {
  const { id, recordId } = await params

  return (
    <RecordForm
      instituteId={Number(id)}
      kind="groups"
      recordId={Number(recordId)}
    />
  )
}
