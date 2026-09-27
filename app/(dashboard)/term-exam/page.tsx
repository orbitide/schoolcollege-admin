import type { Metadata } from "next"
import { Suspense } from "react"

import { TermExamList } from "@/components/term-exams/term-exam-list"

export const metadata: Metadata = {
  title: "Term exams · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary
// on this otherwise static page.
export default function TermExamsPage() {
  return (
    <Suspense>
      <TermExamList />
    </Suspense>
  )
}
