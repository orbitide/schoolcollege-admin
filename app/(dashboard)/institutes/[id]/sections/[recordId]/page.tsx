import type { Metadata } from "next"

import { RecordDetail } from "@/components/institutes/academic/record-detail"

export const metadata: Metadata = {
  title: "Section · SMS Admin",
}

export default async function SectionPage({
  params,
}: PageProps<"/institutes/[id]/sections/[recordId]">) {
  const { id, recordId } = await params

  return <RecordDetail instituteId={Number(id)} kind="sections" recordId={Number(recordId)} />
}
