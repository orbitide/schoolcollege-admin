import type { Metadata } from "next"

import { RecordForm } from "@/components/institutes/academic/record-form"

export const metadata: Metadata = {
  title: "Add category · SMS Admin",
}

export default async function NewCategoriesPage({
  params,
}: PageProps<"/institutes/[id]/categories/new">) {
  const { id } = await params

  return <RecordForm instituteId={Number(id)} kind="categories" />
}
