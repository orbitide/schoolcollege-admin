import type { Metadata } from "next"
import { Suspense } from "react"

import { BranchSurfaceList } from "@/components/branches/branch-surface-list"

export const metadata: Metadata = {
  title: "Branch Manage Admin · SMS Admin",
}

// Legacy Branch/ManageAdmin.
export default function BranchesAdminPage() {
  return (
    <Suspense>
      <BranchSurfaceList surface="Admin" />
    </Suspense>
  )
}
