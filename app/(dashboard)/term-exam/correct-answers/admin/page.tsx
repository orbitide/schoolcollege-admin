import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { CorrectAnswerList } from "@/components/term-exams/correct-answer-list"

export const metadata: Metadata = {
  title: "Correct answers (Admin) · SMS Admin",
}

export default function CorrectAnswersAdminPage() {
  return (
    <RequireSurface resource="correct-answer" surface="Admin">
      <Suspense>
        <CorrectAnswerList surface="Admin" />
      </Suspense>
    </RequireSurface>
  )
}
