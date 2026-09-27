import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Add holiday or event · SMS Admin",
}

export default async function NewHolidaysPage({
  params,
}: PageProps<"/institutes/[id]/holidays/new">) {
  const { id } = await params

  return <RecordForm instituteId={Number(id)} kind="holidays" />
}
