import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Chapters & topics · SMS Admin",
}

export default async function QuestionChaptersPage({ params }: PageProps<"/institutes/[id]/question-chapters">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="questionChapters" />
}
