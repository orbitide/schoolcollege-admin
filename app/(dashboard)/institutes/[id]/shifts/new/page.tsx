import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Add shift · SMS Admin",
}

export default async function NewShiftPage({
  params,
}: PageProps<"/institutes/[id]/shifts/new">) {
  const { id } = await params

  return <RecordForm instituteId={Number(id)} kind="shifts" />
}
