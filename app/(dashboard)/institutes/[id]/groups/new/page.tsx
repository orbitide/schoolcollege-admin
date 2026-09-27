import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Add group · SMS Admin",
}

export default async function NewGroupsPage({
  params,
}: PageProps<"/institutes/[id]/groups/new">) {
  const { id } = await params

  return <RecordForm instituteId={Number(id)} kind="groups" />
}
