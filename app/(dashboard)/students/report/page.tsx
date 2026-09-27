import type { Metadata } from "next"
import { Suspense } from "react"

import { StudentReportForm } from "@/components/students/student-report-form"

export const metadata: Metadata = {
  title: "Student dynamic report · SMS Admin",
}

// The form restores its choices from the URL, which needs a Suspense
// boundary on a static page.
export default function StudentReportPage() {
  return (
    <Suspense>
      <StudentReportForm />
    </Suspense>
  )
}
