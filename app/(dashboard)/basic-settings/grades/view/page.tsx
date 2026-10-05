import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupSurfaceList } from "@/components/basic-settings/lookup/lookup-surface-list"

export const metadata: Metadata = {
  title: "Letter Grade View · SMS Admin",
}

// Legacy LetterGrade/ManageView.
export default function Page() {
  return (
    <Suspense>
      <LookupSurfaceList lookup="grades" surface="View" />
    </Suspense>
  )
}
