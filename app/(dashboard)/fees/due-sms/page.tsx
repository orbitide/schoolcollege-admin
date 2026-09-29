import type { Metadata } from "next"
import { Suspense } from "react"

import { DueSms } from "@/components/fees/due-sms"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Due SMS · SMS Admin",
}

// The page keeps its filters in the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <RequireSurface resource="fee-due-sms" surface={"Manage"}>
      <Suspense>
        <DueSms />
      </Suspense>
    </RequireSurface>
  )
}
