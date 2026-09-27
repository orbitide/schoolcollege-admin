import type { Metadata } from "next"
import { Suspense } from "react"

import { MarksList } from "@/components/term-exam-marks/marks-list"

export const metadata: Metadata = {
  title: "Student marks · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary
// on this otherwise static page.
export default function MarksListPage() {
  return (
    <Suspense>
      <MarksList />
    </Suspense>
  )
}
