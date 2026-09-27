import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Add academic year · SMS Admin",
}

export default async function NewYearsPage({
  params,
}: PageProps<"/institutes/[id]/years/new">) {
  const { id } = await params

  return <RecordForm instituteId={Number(id)} kind="years" />
}
