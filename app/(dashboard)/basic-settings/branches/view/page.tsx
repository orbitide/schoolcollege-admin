import type { Metadata } from "next"
import { Suspense } from "react"

import { BranchSurfaceList } from "@/components/branches/branch-surface-list"

export const metadata: Metadata = {
  title: "Branch View · SMS Admin",
}

// Legacy Branch/ManageView.
export default function BranchesViewPage() {
  return (
    <Suspense>
      <BranchSurfaceList surface="View" />
    </Suspense>
  )
}
