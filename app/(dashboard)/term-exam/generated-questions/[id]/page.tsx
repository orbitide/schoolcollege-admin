import type { Metadata } from "next"

import { GeneratedPaperDetail } from "@/components/question-papers/generated-paper-detail"
import { GENERATED_PAPERS_RESOURCE } from "@/components/question-papers/generated-paper-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Generated question · SMS Admin",
}

export default async function GeneratedPaperPage({ params, searchParams }: PageProps<"/term-exam/generated-questions/[id]">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <RequireSurface resource={GENERATED_PAPERS_RESOURCE} surface={["Admin", "Manage", "View"]}>
      <GeneratedPaperDetail id={Number(id)} returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />
    </RequireSurface>
  )
}
