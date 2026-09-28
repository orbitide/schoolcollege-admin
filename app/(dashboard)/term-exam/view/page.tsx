import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { TermExamList } from "@/components/term-exams/term-exam-list"

export const metadata: Metadata = {
  title: "Term exams (View) · SMS Admin",
}

export default function TermExamsViewPage() {
  return (
    <RequireSurface resource="term-exam" surface="View">
      <Suspense>
        <TermExamList surface="View" />
      </Suspense>
    </RequireSurface>
  )
}
