import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Letter Grade Manage Admin · SMS Admin",
}

// Legacy LetterGrade/ManageAdmin.
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="grades" surface="Admin" />
    </Suspense>
  )
}
