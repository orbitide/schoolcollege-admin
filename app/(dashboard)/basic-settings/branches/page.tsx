import type { Metadata } from "next"
import { Suspense } from "react"

import { BranchSurfaceList } from "@/components/branches/branch-surface-list"

export const metadata: Metadata = {
  title: "Branch Manage · SMS Admin",
}

// Legacy Branch/Manage.
export default function BranchesManagePage() {
  return (
    <Suspense>
      <BranchSurfaceList surface="Manage" />
    </Suspense>
  )
}
