import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Add fee head · SMS Admin",
}

export default async function NewFeeHeadsPage({ params }: PageProps<"/institutes/[id]/fee-heads/new">) {
  const { id } = await params

  return <RecordForm instituteId={Number(id)} kind="feeHeads" />
}
