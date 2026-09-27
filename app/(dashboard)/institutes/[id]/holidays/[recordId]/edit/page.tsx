import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit holiday or event · SMS Admin",
}

export default async function EditHolidaysPage({
  params,
}: PageProps<"/institutes/[id]/holidays/[recordId]/edit">) {
  const { id, recordId } = await params

  return (
    <RecordForm
      instituteId={Number(id)}
      kind="holidays"
      recordId={Number(recordId)}
    />
  )
}
