import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Add branch · SMS Admin",
}

export default async function NewBranchPage({
  params,
}: PageProps<"/institutes/[id]/branches/new">) {
  const { id } = await params

  return <RecordForm instituteId={Number(id)} kind="branches" />
}
