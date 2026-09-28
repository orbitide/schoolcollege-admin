import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { TermExamList } from "@/components/term-exams/term-exam-list"

export const metadata: Metadata = {
  title: "Term exams · SMS Admin",
}

// The Manage surface; /term-exam/admin and /term-exam/view sit beside it.
// The list reads its filters from the URL, which needs a Suspense boundary
// on this otherwise static page.
export default function TermExamsPage() {
  return (
    <RequireSurface resource="term-exam" surface="Manage">
      <Suspense>
        <TermExamList surface="Manage" />
      </Suspense>
    </RequireSurface>
  )
}
