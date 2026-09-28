import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { SubjectStudentList } from "@/components/reports/subject-student-list"

export const metadata: Metadata = {
  title: "Subject Student List · SMS Admin",
}

// Read-only, so any surface of "subject-student-list" may see it. The filter
// lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function SubjectStudentsPage() {
  return (
    <RequireSurface resource="subject-student-list" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <SubjectStudentList />
      </Suspense>
    </RequireSurface>
  )
}
