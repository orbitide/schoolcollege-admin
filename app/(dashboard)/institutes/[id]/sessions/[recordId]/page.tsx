import type { Metadata } from "next"

import { RecordDetail } from "@/components/institutes/academic/record-detail"

export const metadata: Metadata = {
  title: "Session · SMS Admin",
}

export default async function SessionPage({
  params,
}: PageProps<"/institutes/[id]/sessions/[recordId]">) {
  const { id, recordId } = await params

  return <RecordDetail instituteId={Number(id)} kind="sessions" recordId={Number(recordId)} />
}
