import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Sections · SMS Admin",
}

export default async function SectionsPage({
  params,
}: PageProps<"/institutes/[id]/sections">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="sections" />
}
