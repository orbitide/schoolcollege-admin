import type { Metadata } from "next"

import { RecordDetail } from "@/components/institutes/academic/record-detail"

export const metadata: Metadata = {
  title: "fee head · SMS Admin",
}

export default async function FeeHeadsDetailPage({ params }: PageProps<"/institutes/[id]/fee-heads/[recordId]">) {
  const { id, recordId } = await params

  return <RecordDetail instituteId={Number(id)} kind="feeHeads" recordId={Number(recordId)} />
}
