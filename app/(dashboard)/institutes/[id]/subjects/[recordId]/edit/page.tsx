import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit subject · SMS Admin",
}

export default async function EditSubjectsPage({
  params,
}: PageProps<"/institutes/[id]/subjects/[recordId]/edit">) {
  const { id, recordId } = await params

  return (
    <RecordForm
      instituteId={Number(id)}
      kind="subjects"
      recordId={Number(recordId)}
    />
  )
}
