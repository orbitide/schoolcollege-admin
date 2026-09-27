import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Classes · SMS Admin",
}

export default async function ClassesPage({
  params,
}: PageProps<"/institutes/[id]/classes">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="classes" />
}
