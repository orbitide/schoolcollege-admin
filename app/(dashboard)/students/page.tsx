import type { Metadata } from "next"
import { Suspense } from "react"

import { StudentList } from "@/components/students/student-list"

export const metadata: Metadata = {
  title: "Students · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary
// on this otherwise static page.
export default function StudentsPage() {
  return (
    <Suspense>
      <StudentList />
    </Suspense>
  )
}
