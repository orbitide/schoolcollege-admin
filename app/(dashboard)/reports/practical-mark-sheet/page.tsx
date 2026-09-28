import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { PracticalMarkSheet } from "@/components/reports/practical-mark-sheet"

export const metadata: Metadata = {
  title: "Practical Mark Collection Sheet · SMS Admin",
}

// Read-only, so any surface of "practical-mark-sheet" may see it. The filter
// lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function PracticalMarkSheetPage() {
  return (
    <RequireSurface resource="practical-mark-sheet" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <PracticalMarkSheet />
      </Suspense>
    </RequireSurface>
  )
}
