import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Add section · SMS Admin",
}

export default async function NewSectionsPage({
  params,
}: PageProps<"/institutes/[id]/sections/new">) {
  const { id } = await params

  return <RecordForm instituteId={Number(id)} kind="sections" />
}
