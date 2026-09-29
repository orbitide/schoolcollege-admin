import type { Metadata } from "next"
import { Suspense } from "react"

import { CollectionReport } from "@/components/fees/collection-report"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Collection Report · SMS Admin",
}

// The page keeps its filters in the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <RequireSurface resource="fee-collection-report" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <CollectionReport />
      </Suspense>
    </RequireSurface>
  )
}
