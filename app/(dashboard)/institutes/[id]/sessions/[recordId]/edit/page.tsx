import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit session · SMS Admin",
}

export default async function EditSessionsPage({
  params,
}: PageProps<"/institutes/[id]/sessions/[recordId]/edit">) {
  const { id, recordId } = await params

  return (
    <RecordForm
      instituteId={Number(id)}
      kind="sessions"
      recordId={Number(recordId)}
    />
  )
}
