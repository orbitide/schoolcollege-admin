import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Groups · SMS Admin",
}

export default async function GroupsPage({
  params,
}: PageProps<"/institutes/[id]/groups">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="groups" />
}
