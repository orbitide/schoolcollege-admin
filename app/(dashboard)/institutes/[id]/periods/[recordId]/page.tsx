import type { Metadata } from "next"

import { RecordDetail } from "@/components/institutes/academic/record-detail"

export const metadata: Metadata = {
  title: "period · SMS Admin",
}

export default async function PeriodsDetailPage({ params }: PageProps<"/institutes/[id]/periods/[recordId]">) {
  const { id, recordId } = await params

  return <RecordDetail instituteId={Number(id)} kind="routinePeriods" recordId={Number(recordId)} />
}
