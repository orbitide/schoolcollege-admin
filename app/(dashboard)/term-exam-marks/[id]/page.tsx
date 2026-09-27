import type { Metadata } from "next"

import { MarkDetail } from "@/components/term-exam-marks/mark-detail"

export const metadata: Metadata = {
  title: "Student marks details · SMS Admin",
}

export default async function MarkDetailPage({
  params,
  searchParams,
}: PageProps<"/term-exam-marks/[id]">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return <MarkDetail id={Number(id)} returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />
}
