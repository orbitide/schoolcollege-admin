import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Add letter grade · SMS Admin",
}

export default async function NewGradesPage({
  params,
}: PageProps<"/institutes/[id]/grades/new">) {
  const { id } = await params

  return <RecordForm instituteId={Number(id)} kind="grades" />
}
