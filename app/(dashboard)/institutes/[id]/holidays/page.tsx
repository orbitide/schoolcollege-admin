import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Holidays & events · SMS Admin",
}

export default async function HolidaysPage({
  params,
}: PageProps<"/institutes/[id]/holidays">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="holidays" />
}
