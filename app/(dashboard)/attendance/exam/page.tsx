import type { Metadata } from "next"
import { Suspense } from "react"

import { ExamAttendance } from "@/components/attendance/exam-attendance"

export const metadata: Metadata = {
  title: "Exam attendance · SMS Admin",
}

// The page reads its filters from the URL, which needs a Suspense boundary
// on this otherwise static page.
export default function ExamAttendancePage() {
  return (
    <Suspense>
      <ExamAttendance />
    </Suspense>
  )
}
