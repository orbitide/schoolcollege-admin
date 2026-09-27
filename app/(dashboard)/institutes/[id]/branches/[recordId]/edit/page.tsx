import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit branch · SMS Admin",
}

export default async function EditBranchesPage({
  params,
}: PageProps<"/institutes/[id]/branches/[recordId]/edit">) {
  const { id, recordId } = await params

  return (
    <RecordForm
      instituteId={Number(id)}
      kind="branches"
      recordId={Number(recordId)}
    />
  )
}
