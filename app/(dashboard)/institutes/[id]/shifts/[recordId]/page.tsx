import type { Metadata } from "next"

import { RecordDetail } from "@/components/institutes/academic/record-detail"

export const metadata: Metadata = {
  title: "Shift · SMS Admin",
}

export default async function ShiftPage({
  params,
}: PageProps<"/institutes/[id]/shifts/[recordId]">) {
  const { id, recordId } = await params

  return <RecordDetail instituteId={Number(id)} kind="shifts" recordId={Number(recordId)} />
}
