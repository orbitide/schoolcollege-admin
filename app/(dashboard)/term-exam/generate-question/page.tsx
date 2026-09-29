import type { Metadata } from "next"
import { Suspense } from "react"

import { GenerateQuestion } from "@/components/question-papers/generate-question"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Generate question · SMS Admin",
}

// Generating needs the Manage (or Admin) surface of "question-generate". The
// page reads its filters from the URL, which needs a Suspense boundary.
export default function GenerateQuestionPage() {
  return (
    <RequireSurface resource="question-generate" surface={["Admin", "Manage"]}>
      <Suspense>
        <GenerateQuestion />
      </Suspense>
    </RequireSurface>
  )
}
