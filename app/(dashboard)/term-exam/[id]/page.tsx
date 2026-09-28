import type { Metadata } from "next"

import { RequireSurface } from "@/components/require-surface"
import { TermExamDetail } from "@/components/term-exams/term-exam-detail"

export const metadata: Metadata = {
  title: "Term exam · SMS Admin",
}

export default async function TermExamPage({
  params,
  searchParams,
}: PageProps<"/term-exam/[id]">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <RequireSurface resource="term-exam" surface={["Admin", "Manage", "View"]}>
      <TermExamDetail
        id={Number(id)}
        returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo}
      />
    </RequireSurface>
  )
}
