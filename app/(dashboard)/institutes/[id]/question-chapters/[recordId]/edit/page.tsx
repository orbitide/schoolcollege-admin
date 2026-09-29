import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit chapter · SMS Admin",
}

export default async function EditQuestionChaptersPage({ params }: PageProps<"/institutes/[id]/question-chapters/[recordId]/edit">) {
  const { id, recordId } = await params

  return <RecordForm instituteId={Number(id)} kind="questionChapters" recordId={Number(recordId)} />
}
