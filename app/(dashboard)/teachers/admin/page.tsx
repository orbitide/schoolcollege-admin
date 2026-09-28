import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { TeacherList } from "@/components/teachers/teacher-list"

export const metadata: Metadata = {
  title: "Teachers (Admin) · SMS Admin",
}

export default function TeachersAdminPage() {
  return (
    <RequireSurface resource="teacher" surface="Admin">
      <Suspense>
        <TeacherList surface="Admin" />
      </Suspense>
    </RequireSurface>
  )
}
