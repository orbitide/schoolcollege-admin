import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Add house · SMS Admin",
}

export default async function NewHousesPage({
  params,
}: PageProps<"/institutes/[id]/houses/new">) {
  const { id } = await params

  return <RecordForm instituteId={Number(id)} kind="houses" />
}
