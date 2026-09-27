import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Result remarks · SMS Admin",
}

export default async function RemarksPage({
  params,
}: PageProps<"/institutes/[id]/remarks">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="remarks" />
}
