import type { Metadata } from "next"
import { Suspense } from "react"

import { BranchForm } from "@/components/branches/branch-form"

export const metadata: Metadata = {
  title: "Add branch · SMS Admin",
}

export default function NewBranchPage() {
  return (
    <Suspense>
      <BranchForm />
    </Suspense>
  )
}
