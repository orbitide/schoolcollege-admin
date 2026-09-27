import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit shift · SMS Admin",
}

export default async function EditShiftPage({
  params,
}: PageProps<"/institutes/[id]/shifts/[shiftId]/edit">) {
  const { id, shiftId } = await params

  return (
    <RecordForm
      instituteId={Number(id)}
      kind="shifts"
      recordId={Number(shiftId)}
    />
  )
}
