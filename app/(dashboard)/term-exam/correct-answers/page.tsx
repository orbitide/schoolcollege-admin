import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { CorrectAnswerList } from "@/components/term-exams/correct-answer-list"

export const metadata: Metadata = {
  title: "Correct answers · SMS Admin",
}

// The Manage surface; /term-exam/correct-answers/admin sits beside it.
// The list reads its filters from the URL, which needs a Suspense boundary
// on this otherwise static page.
export default function CorrectAnswersPage() {
  return (
    <RequireSurface resource="correct-answer" surface="Manage">
      <Suspense>
        <CorrectAnswerList surface="Manage" />
      </Suspense>
    </RequireSurface>
  )
}
