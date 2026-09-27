import type { Metadata } from "next"
import { Suspense } from "react"

import { SubjectMarksEdit } from "@/components/term-exam-marks/subject-marks-edit"

export const metadata: Metadata = {
  title: "Subject marks edit · SMS Admin",
}

// The page can be opened with the section, exam and subject in the URL,
// which needs a Suspense boundary on this otherwise static page.
export default function SubjectMarksEditPage() {
  return (
    <Suspense>
      <SubjectMarksEdit />
    </Suspense>
  )
}
