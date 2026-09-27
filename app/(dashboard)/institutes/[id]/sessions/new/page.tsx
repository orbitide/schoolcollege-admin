import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Add session · SMS Admin",
}

export default async function NewSessionsPage({
  params,
}: PageProps<"/institutes/[id]/sessions/new">) {
  const { id } = await params

  return <RecordForm instituteId={Number(id)} kind="sessions" />
}
