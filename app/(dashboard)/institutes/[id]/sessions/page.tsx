import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Sessions · SMS Admin",
}

export default async function SessionsPage({
  params,
}: PageProps<"/institutes/[id]/sessions">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="sessions" />
}
