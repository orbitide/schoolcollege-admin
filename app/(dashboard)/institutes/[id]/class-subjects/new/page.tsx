import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Add class year subject · SMS Admin",
}

export default async function NewClassSubjectsPage({
  params,
}: PageProps<"/institutes/[id]/class-subjects/new">) {
  const { id } = await params

  return <RecordForm instituteId={Number(id)} kind="classSubjects" />
}
