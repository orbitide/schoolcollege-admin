import type { Metadata } from "next"
import { Suspense } from "react"

import { TeacherRoutine } from "@/components/routine/teacher-routine"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Teacher Routine · SMS Admin",
}

// The page keeps its filters in the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <RequireSurface resource="teacher-routine" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <TeacherRoutine />
      </Suspense>
    </RequireSurface>
  )
}
