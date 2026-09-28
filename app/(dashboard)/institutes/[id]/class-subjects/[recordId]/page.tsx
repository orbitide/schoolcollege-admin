import type { Metadata } from "next"

import { RecordDetail } from "@/components/institutes/academic/record-detail"

export const metadata: Metadata = {
  title: "Class year subject · SMS Admin",
}

export default async function ClassSubjectPage({
  params,
}: PageProps<"/institutes/[id]/class-subjects/[recordId]">) {
  const { id, recordId } = await params

  return <RecordDetail instituteId={Number(id)} kind="classSubjects" recordId={Number(recordId)} />
}
