import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { TeacherList } from "@/components/teachers/teacher-list"

export const metadata: Metadata = {
  title: "Teachers · SMS Admin",
}

// The Manage surface; /teachers/admin and /teachers/view sit beside it.
// The list reads its filters from the URL, which needs a Suspense boundary
// on this otherwise static page.
export default function TeachersPage() {
  return (
    <RequireSurface resource="teacher" surface="Manage">
      <Suspense>
        <TeacherList surface="Manage" />
      </Suspense>
    </RequireSurface>
  )
}
