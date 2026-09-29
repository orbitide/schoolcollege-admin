import type { Metadata } from "next"
import { Suspense } from "react"

import { QUESTIONS_RESOURCE, QuestionList } from "@/components/questions/question-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Questions (View) · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <RequireSurface resource={QUESTIONS_RESOURCE} surface="View">
      <Suspense>
        <QuestionList surface="View" />
      </Suspense>
    </RequireSurface>
  )
}
