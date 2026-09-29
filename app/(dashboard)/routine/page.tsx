import type { Metadata } from "next"
import { Suspense } from "react"

import { ClassRoutine } from "@/components/routine/class-routine"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Class Routine · SMS Admin",
}

// The page keeps its filters in the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <RequireSurface resource="class-routine" surface={"Manage"}>
      <Suspense>
        <ClassRoutine editable />
      </Suspense>
    </RequireSurface>
  )
}
