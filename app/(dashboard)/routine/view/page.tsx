import type { Metadata } from "next"
import { Suspense } from "react"

import { ClassRoutine } from "@/components/routine/class-routine"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "View Class Routine · SMS Admin",
}

// The page keeps its filters in the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <RequireSurface resource="class-routine" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <ClassRoutine editable={false} />
      </Suspense>
    </RequireSurface>
  )
}
