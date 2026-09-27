import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Edit category · SMS Admin",
}

export default async function EditCategoriesPage({
  params,
}: PageProps<"/institutes/[id]/categories/[recordId]/edit">) {
  const { id, recordId } = await params

  return (
    <RecordForm
      instituteId={Number(id)}
      kind="categories"
      recordId={Number(recordId)}
    />
  )
}
