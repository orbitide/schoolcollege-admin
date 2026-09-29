import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit period · SMS Admin",
}

export default async function EditPeriodsPage({ params }: PageProps<"/institutes/[id]/periods/[recordId]/edit">) {
  const { id, recordId } = await params

  return <RecordForm instituteId={Number(id)} kind="routinePeriods" recordId={Number(recordId)} />
}
