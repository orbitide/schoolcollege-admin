import type { Metadata } from "next"

import { RecordDetail } from "@/components/institutes/academic/record-detail"

export const metadata: Metadata = {
  title: "Category · SMS Admin",
}

export default async function CategoryPage({
  params,
}: PageProps<"/institutes/[id]/categories/[recordId]">) {
  const { id, recordId } = await params

  return <RecordDetail instituteId={Number(id)} kind="categories" recordId={Number(recordId)} />
}
