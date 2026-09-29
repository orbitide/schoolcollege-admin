import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Add chapter · SMS Admin",
}

export default async function NewQuestionChaptersPage({ params }: PageProps<"/institutes/[id]/question-chapters/new">) {
  const { id } = await params

  return <RecordForm instituteId={Number(id)} kind="questionChapters" />
}
