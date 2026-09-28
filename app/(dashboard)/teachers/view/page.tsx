import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { TeacherList } from "@/components/teachers/teacher-list"

export const metadata: Metadata = {
  title: "Teachers (View) · SMS Admin",
}

export default function TeachersViewPage() {
  return (
    <RequireSurface resource="teacher" surface="View">
      <Suspense>
        <TeacherList surface="View" />
      </Suspense>
    </RequireSurface>
  )
}
