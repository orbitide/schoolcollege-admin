import type { Metadata } from "next"
import { Suspense } from "react"

import { DueReport } from "@/components/fees/due-report"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Due Report · SMS Admin",
}

// The page keeps its filters in the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <RequireSurface resource="fee-due-report" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <DueReport />
      </Suspense>
    </RequireSurface>
  )
}
