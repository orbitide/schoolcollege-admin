import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Add building · SMS Admin",
}

export default async function NewBuildingPage({ params }: PageProps<"/institutes/[id]/buildings/new">) {
  const { id } = await params

  return <RecordForm instituteId={Number(id)} kind="buildings" />
}
