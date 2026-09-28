import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { TermExamList } from "@/components/term-exams/term-exam-list"

export const metadata: Metadata = {
  title: "Term exams (Admin) · SMS Admin",
}

export default function TermExamsAdminPage() {
  return (
    <RequireSurface resource="term-exam" surface="Admin">
      <Suspense>
        <TermExamList surface="Admin" />
      </Suspense>
    </RequireSurface>
  )
}
