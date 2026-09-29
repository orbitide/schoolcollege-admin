import type { Metadata } from "next"
import { Suspense } from "react"

import { OmrSheetPrint } from "@/components/omr/omr-sheet-print"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "OMR sheet · SMS Admin",
}

// Printing sheets needs any surface of "omr-sheet". The page reads its
// filters from the URL, which needs a Suspense boundary.
export default function OmrSheetPage() {
  return (
    <RequireSurface resource="omr-sheet" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <OmrSheetPrint />
      </Suspense>
    </RequireSurface>
  )
}
