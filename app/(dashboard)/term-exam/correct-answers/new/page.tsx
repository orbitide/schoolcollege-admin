import type { Metadata } from "next"

import { RequireSurface } from "@/components/require-surface"
import { CorrectAnswerForm } from "@/components/term-exams/correct-answer-form"

export const metadata: Metadata = {
  title: "Add correct answer · SMS Admin",
}

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

// ?institute=, ?class= and ?exam= preselect the list's filters.
export default async function NewCorrectAnswerPage({
  searchParams,
}: PageProps<"/term-exam/correct-answers/new">) {
  const query = await searchParams

  return (
    <RequireSurface resource="correct-answer" surface={["Admin", "Manage"]}>
      <CorrectAnswerForm
        instituteId={Number(one(query.institute)) || undefined}
        classId={Number(one(query.class)) || undefined}
        examId={Number(one(query.exam)) || undefined}
        returnTo={one(query.returnTo)}
      />
    </RequireSurface>
  )
}
