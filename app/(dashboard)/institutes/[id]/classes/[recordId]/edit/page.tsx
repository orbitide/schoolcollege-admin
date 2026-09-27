import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit class · SMS Admin",
}

export default async function EditClassesPage({
  params,
}: PageProps<"/institutes/[id]/classes/[recordId]/edit">) {
  const { id, recordId } = await params

  return (
    <RecordForm
      instituteId={Number(id)}
      kind="classes"
      recordId={Number(recordId)}
    />
  )
}
