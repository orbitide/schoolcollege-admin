import type { Metadata } from "next"

import { CorrectAnswerForm } from "@/components/term-exams/correct-answer-form"

export const metadata: Metadata = {
  title: "Edit correct answer · SMS Admin",
}

export default async function EditCorrectAnswerPage({
  params,
  searchParams,
}: PageProps<"/term-exam/correct-answers/[id]/edit">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <CorrectAnswerForm
      answerId={Number(id)}
      returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo}
    />
  )
}
