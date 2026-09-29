import type { Metadata } from "next"
import { Suspense } from "react"

import { FeeCollection } from "@/components/fees/fee-collection"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Fee Collection · SMS Admin",
}

// The page keeps its filters in the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <RequireSurface resource="fee-collection" surface={"Manage"}>
      <Suspense>
        <FeeCollection />
      </Suspense>
    </RequireSurface>
  )
}
