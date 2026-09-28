import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit building · SMS Admin",
}

export default async function EditBuildingPage({
  params,
}: PageProps<"/institutes/[id]/buildings/[recordId]/edit">) {
  const { id, recordId } = await params

  return <RecordForm instituteId={Number(id)} kind="buildings" recordId={Number(recordId)} />
}
