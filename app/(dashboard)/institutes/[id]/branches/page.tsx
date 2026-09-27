import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Branches · SMS Admin",
}

export default async function BranchesPage({
  params,
}: PageProps<"/institutes/[id]/branches">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="branches" />
}
