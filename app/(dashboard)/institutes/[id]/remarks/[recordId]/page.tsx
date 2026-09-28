import type { Metadata } from "next"

import { RecordDetail } from "@/components/institutes/academic/record-detail"

export const metadata: Metadata = {
  title: "Result remark · SMS Admin",
}

export default async function RemarkPage({
  params,
}: PageProps<"/institutes/[id]/remarks/[recordId]">) {
  const { id, recordId } = await params

  return <RecordDetail instituteId={Number(id)} kind="remarks" recordId={Number(recordId)} />
}
