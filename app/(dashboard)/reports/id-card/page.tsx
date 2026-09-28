import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { IdCard } from "@/components/reports/id-card"

export const metadata: Metadata = {
  title: "ID Card · SMS Admin",
}

// Read-only, so any surface of "id-card" may see it. The filter lives in the
// URL, which needs a Suspense boundary on this otherwise static page.
export default function IdCardPage() {
  return (
    <RequireSurface resource="id-card" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <IdCard />
      </Suspense>
    </RequireSurface>
  )
}
