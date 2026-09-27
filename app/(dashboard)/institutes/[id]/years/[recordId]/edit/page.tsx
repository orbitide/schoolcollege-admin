import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit academic year · SMS Admin",
}

export default async function EditYearsPage({
  params,
}: PageProps<"/institutes/[id]/years/[recordId]/edit">) {
  const { id, recordId } = await params

  return (
    <RecordForm
      instituteId={Number(id)}
      kind="years"
      recordId={Number(recordId)}
    />
  )
}
