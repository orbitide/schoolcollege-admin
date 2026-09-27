import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Add result remark · SMS Admin",
}

export default async function NewRemarksPage({
  params,
}: PageProps<"/institutes/[id]/remarks/new">) {
  const { id } = await params

  return <RecordForm instituteId={Number(id)} kind="remarks" />
}
