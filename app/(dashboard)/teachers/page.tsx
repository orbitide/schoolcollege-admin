import type { Metadata } from "next"
import { Suspense } from "react"

import { TeacherList } from "@/components/teachers/teacher-list"

export const metadata: Metadata = {
  title: "Teachers · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary
// on this otherwise static page.
export default function TeachersPage() {
  return (
    <Suspense>
      <TeacherList />
    </Suspense>
  )
}
