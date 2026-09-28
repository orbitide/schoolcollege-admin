import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { StudentInformationReport } from "@/components/reports/student-information"

export const metadata: Metadata = {
  title: "Student Information · SMS Admin",
}

// Read-only, so any surface of "student-information" may see it. The filter
// lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function StudentInformationPage() {
  return (
    <RequireSurface resource="student-information" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <StudentInformationReport />
      </Suspense>
    </RequireSurface>
  )
}
