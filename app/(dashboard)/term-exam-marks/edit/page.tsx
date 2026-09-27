import type { Metadata } from "next"
import { Suspense } from "react"

import { MarksEdit } from "@/components/term-exam-marks/marks-edit"

export const metadata: Metadata = {
  title: "Edit student marks · SMS Admin",
}

// The page can be opened with the exam and roll in the URL, which needs a
// Suspense boundary on this otherwise static page.
export default function MarksEditPage() {
  return (
    <Suspense>
      <MarksEdit />
    </Suspense>
  )
}
