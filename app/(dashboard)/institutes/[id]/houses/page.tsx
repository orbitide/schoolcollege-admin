import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Houses · SMS Admin",
}

export default async function HousesPage({
  params,
}: PageProps<"/institutes/[id]/houses">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="houses" />
}
