import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit class year subject · SMS Admin",
}

export default async function EditClassSubjectsPage({
  params,
}: PageProps<"/institutes/[id]/class-subjects/[recordId]/edit">) {
  const { id, recordId } = await params

  return (
    <RecordForm
      instituteId={Number(id)}
      kind="classSubjects"
      recordId={Number(recordId)}
    />
  )
}
