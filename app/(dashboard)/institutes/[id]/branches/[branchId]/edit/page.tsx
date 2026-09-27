import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit branch · SMS Admin",
}

export default async function EditBranchPage({
  params,
}: PageProps<"/institutes/[id]/branches/[branchId]/edit">) {
  const { id, branchId } = await params

  return (
    <RecordForm
      instituteId={Number(id)}
      kind="branches"
      recordId={Number(branchId)}
    />
  )
}
