import type { Metadata } from "next"
import { Suspense } from "react"

import { StudentReportPrint } from "@/components/students/student-report-print"

export const metadata: Metadata = {
  title: "Dynamic student report · SMS Admin",
}

// Outside the dashboard layout so only the report prints. Reads its
// settings from the URL, which needs a Suspense boundary on a static page.
export default function StudentReportPrintPage() {
  return (
    <Suspense>
      <StudentReportPrint />
    </Suspense>
  )
}
