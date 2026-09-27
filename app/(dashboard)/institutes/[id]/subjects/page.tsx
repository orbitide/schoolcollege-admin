import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Subjects · SMS Admin",
}

export default async function SubjectsPage({
  params,
}: PageProps<"/institutes/[id]/subjects">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="subjects" />
}
