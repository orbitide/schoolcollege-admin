import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Add period · SMS Admin",
}

export default async function NewPeriodsPage({ params }: PageProps<"/institutes/[id]/periods/new">) {
  const { id } = await params

  return <RecordForm instituteId={Number(id)} kind="routinePeriods" />
}
