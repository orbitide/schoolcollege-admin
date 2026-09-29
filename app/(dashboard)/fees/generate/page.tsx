import type { Metadata } from "next"
import { Suspense } from "react"

import { GenerateDues } from "@/components/fees/generate-dues"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Generate Dues · SMS Admin",
}

// The page keeps its filters in the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <RequireSurface resource="fee-generate" surface={"Manage"}>
      <Suspense>
        <GenerateDues />
      </Suspense>
    </RequireSurface>
  )
}
