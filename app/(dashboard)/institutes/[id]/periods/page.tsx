import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Periods · SMS Admin",
}

export default async function PeriodsPage({ params }: PageProps<"/institutes/[id]/periods">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="routinePeriods" />
}
