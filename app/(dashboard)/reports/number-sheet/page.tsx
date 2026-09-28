import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { NumberSheet } from "@/components/reports/number-sheet"

export const metadata: Metadata = {
  title: "Number Sheet · SMS Admin",
}

// Read-only, so any surface of "number-sheet" may see it. The filter lives in
// the URL, which needs a Suspense boundary on this otherwise static page.
export default function NumberSheetPage() {
  return (
    <RequireSurface resource="number-sheet" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <NumberSheet />
      </Suspense>
    </RequireSurface>
  )
}
