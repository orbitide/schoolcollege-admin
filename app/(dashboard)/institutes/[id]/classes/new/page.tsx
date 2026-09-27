import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Add class · SMS Admin",
}

export default async function NewClassesPage({
  params,
}: PageProps<"/institutes/[id]/classes/new">) {
  const { id } = await params

  return <RecordForm instituteId={Number(id)} kind="classes" />
}
