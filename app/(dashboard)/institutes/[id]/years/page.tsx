import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Academic years · SMS Admin",
}

export default async function YearsPage({
  params,
}: PageProps<"/institutes/[id]/years">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="years" />
}
