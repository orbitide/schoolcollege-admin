import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit shift · SMS Admin",
}

export default async function EditShiftsPage({
  params,
}: PageProps<"/institutes/[id]/shifts/[recordId]/edit">) {
  const { id, recordId } = await params

  return (
    <RecordForm
      instituteId={Number(id)}
      kind="shifts"
      recordId={Number(recordId)}
    />
  )
}
