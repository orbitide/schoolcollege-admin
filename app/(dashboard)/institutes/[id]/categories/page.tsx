import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Categories · SMS Admin",
}

export default async function CategoriesPage({
  params,
}: PageProps<"/institutes/[id]/categories">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="categories" />
}
