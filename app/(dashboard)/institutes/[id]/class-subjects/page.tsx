import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Class year subjects · SMS Admin",
}

export default async function ClassSubjectsPage({
  params,
}: PageProps<"/institutes/[id]/class-subjects">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="classSubjects" />
}
