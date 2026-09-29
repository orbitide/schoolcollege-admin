import type { Metadata } from "next"

import { QuestionDetail } from "@/components/questions/question-detail"
import { QUESTIONS_RESOURCE } from "@/components/questions/question-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Question details · SMS Admin",
}

export default async function QuestionDetailPage({ params, searchParams }: PageProps<"/questions/[id]">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <RequireSurface resource={QUESTIONS_RESOURCE} surface={["Admin", "Manage", "View"]}>
      <QuestionDetail id={Number(id)} returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />
    </RequireSurface>
  )
}
