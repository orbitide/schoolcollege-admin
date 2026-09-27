import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Letter grades · SMS Admin",
}

export default async function GradesPage({
  params,
}: PageProps<"/institutes/[id]/grades">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="grades" />
}
