import type { Metadata } from "next"
import { Suspense } from "react"

import { FeeSetup } from "@/components/fees/fee-setup"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Fee Setup · SMS Admin",
}

// The page keeps its filters in the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <RequireSurface resource="fee-setup" surface={"Manage"}>
      <Suspense>
        <FeeSetup />
      </Suspense>
    </RequireSurface>
  )
}
