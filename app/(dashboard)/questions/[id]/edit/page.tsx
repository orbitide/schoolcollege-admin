import type { Metadata } from "next"

import { QuestionForm } from "@/components/questions/question-form"
import { QUESTIONS_RESOURCE } from "@/components/questions/question-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Edit question · SMS Admin",
}

export default async function EditQuestionPage({ params, searchParams }: PageProps<"/questions/[id]/edit">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <RequireSurface resource={QUESTIONS_RESOURCE} surface={["Admin", "Manage"]}>
      <QuestionForm id={Number(id)} returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />
    </RequireSurface>
  )
}
