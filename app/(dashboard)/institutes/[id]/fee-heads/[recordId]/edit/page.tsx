import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit fee head · SMS Admin",
}

export default async function EditFeeHeadsPage({ params }: PageProps<"/institutes/[id]/fee-heads/[recordId]/edit">) {
  const { id, recordId } = await params

  return <RecordForm instituteId={Number(id)} kind="feeHeads" recordId={Number(recordId)} />
}
