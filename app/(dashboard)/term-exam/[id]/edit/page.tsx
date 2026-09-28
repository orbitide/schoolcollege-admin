import type { Metadata } from "next"

import { RequireSurface } from "@/components/require-surface"
import { TermExamForm } from "@/components/term-exams/term-exam-form"

export const metadata: Metadata = {
  title: "Edit term exam · SMS Admin",
}

export default async function EditTermExamPage({
  params,
  searchParams,
}: PageProps<"/term-exam/[id]/edit">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <RequireSurface resource="term-exam" surface={["Admin", "Manage"]}>
      <TermExamForm
        examId={Number(id)}
        returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo}
      />
    </RequireSurface>
  )
}
