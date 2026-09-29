import type { Metadata } from "next"

import { QuestionForm } from "@/components/questions/question-form"
import { QUESTIONS_RESOURCE } from "@/components/questions/question-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Add question · SMS Admin",
}

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)
const id = (value: string | string[] | undefined) => Number(one(value)) || undefined

export default async function NewQuestionPage({ searchParams }: PageProps<"/questions/new">) {
  const query = await searchParams
  const type = one(query.type)

  return (
    <RequireSurface resource={QUESTIONS_RESOURCE} surface={["Admin", "Manage"]}>
      <QuestionForm
        initial={{
          instituteId: id(query.institute),
          classId: id(query.class),
          subjectId: id(query.subject),
          chapterId: id(query.chapter),
          type: type === "CQ" || type === "MCQ" ? type : undefined,
        }}
        returnTo={one(query.returnTo)}
      />
    </RequireSurface>
  )
}
