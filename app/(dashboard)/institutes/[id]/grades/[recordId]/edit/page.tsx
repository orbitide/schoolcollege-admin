import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit letter grade · SMS Admin",
}

export default async function EditGradesPage({
  params,
}: PageProps<"/institutes/[id]/grades/[recordId]/edit">) {
  const { id, recordId } = await params

  return (
    <RecordForm
      instituteId={Number(id)}
      kind="grades"
      recordId={Number(recordId)}
    />
  )
}
