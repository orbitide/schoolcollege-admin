import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit result remark · SMS Admin",
}

export default async function EditRemarksPage({
  params,
}: PageProps<"/institutes/[id]/remarks/[recordId]/edit">) {
  const { id, recordId } = await params

  return (
    <RecordForm
      instituteId={Number(id)}
      kind="remarks"
      recordId={Number(recordId)}
    />
  )
}
