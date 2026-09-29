import type { Metadata } from "next"

import { RecordDetail } from "@/components/institutes/academic/record-detail"

export const metadata: Metadata = {
  title: "Chapter · SMS Admin",
}

export default async function QuestionChaptersDetailPage({ params }: PageProps<"/institutes/[id]/question-chapters/[recordId]">) {
  const { id, recordId } = await params

  return <RecordDetail instituteId={Number(id)} kind="questionChapters" recordId={Number(recordId)} />
}
