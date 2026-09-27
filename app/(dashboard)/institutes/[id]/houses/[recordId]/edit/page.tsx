import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit house · SMS Admin",
}

export default async function EditHousesPage({
  params,
}: PageProps<"/institutes/[id]/houses/[recordId]/edit">) {
  const { id, recordId } = await params

  return (
    <RecordForm
      instituteId={Number(id)}
      kind="houses"
      recordId={Number(recordId)}
    />
  )
}
