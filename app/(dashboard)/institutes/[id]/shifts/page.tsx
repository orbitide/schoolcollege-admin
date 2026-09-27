import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Shifts · SMS Admin",
}

export default async function ShiftsPage({
  params,
}: PageProps<"/institutes/[id]/shifts">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="shifts" />
}
