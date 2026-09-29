import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Fee heads · SMS Admin",
}

export default async function FeeHeadsPage({ params }: PageProps<"/institutes/[id]/fee-heads">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="feeHeads" />
}
