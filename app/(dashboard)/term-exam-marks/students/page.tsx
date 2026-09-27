import type { Metadata } from "next"
import { Suspense } from "react"

import { StudentExamList } from "@/components/term-exam-marks/student-exam-list"

export const metadata: Metadata = {
  title: "Student exam · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary
// on this otherwise static page.
export default function StudentExamPage() {
  return (
    <Suspense>
      <StudentExamList />
    </Suspense>
  )
}
