import type { Metadata } from "next"
import { Suspense } from "react"

import { OmrScan } from "@/components/omr/omr-scan"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "OMR scan · SMS Admin",
}

// Saving marks needs the Manage (or Admin) surface of "omr-scan". The page
// reads its filters from the URL, which needs a Suspense boundary.
export default function OmrScanPage() {
  return (
    <RequireSurface resource="omr-scan" surface={["Admin", "Manage"]}>
      <Suspense>
        <OmrScan />
      </Suspense>
    </RequireSurface>
  )
}
