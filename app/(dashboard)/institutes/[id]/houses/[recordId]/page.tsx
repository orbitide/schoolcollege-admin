import type { Metadata } from "next"

import { RecordDetail } from "@/components/institutes/academic/record-detail"

export const metadata: Metadata = {
  title: "House · SMS Admin",
}

export default async function HousePage({
  params,
}: PageProps<"/institutes/[id]/houses/[recordId]">) {
  const { id, recordId } = await params

  return <RecordDetail instituteId={Number(id)} kind="houses" recordId={Number(recordId)} />
}
