import type { Metadata } from "next"

import { RecordList } from "@/components/institutes/academic/record-list"

export const metadata: Metadata = {
  title: "Buildings & rooms · SMS Admin",
}

export default async function BuildingsPage({ params }: PageProps<"/institutes/[id]/buildings">) {
  const { id } = await params

  return <RecordList instituteId={Number(id)} kind="buildings" />
}
