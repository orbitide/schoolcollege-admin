import type { Metadata } from "next"
import { Suspense } from "react"

import { FeeWaivers } from "@/components/fees/fee-waivers"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Student Waiver · SMS Admin",
}

// The page keeps its filters in the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <RequireSurface resource="fee-waiver" surface={"Manage"}>
      <Suspense>
        <FeeWaivers />
      </Suspense>
    </RequireSurface>
  )
}
