import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit section · SMS Admin",
}

export default async function EditSectionsPage({
  params,
}: PageProps<"/institutes/[id]/sections/[recordId]/edit">) {
  const { id, recordId } = await params

  return (
    <RecordForm
      instituteId={Number(id)}
      kind="sections"
      recordId={Number(recordId)}
    />
  )
}
