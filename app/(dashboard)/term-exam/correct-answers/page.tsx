import type { Metadata } from "next"
import { Suspense } from "react"

import { CorrectAnswerList } from "@/components/term-exams/correct-answer-list"

export const metadata: Metadata = {
  title: "Correct answers · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary
// on this otherwise static page.
export default function CorrectAnswersPage() {
  return (
    <Suspense>
      <CorrectAnswerList />
    </Suspense>
  )
}
