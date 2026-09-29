import type { Metadata } from "next"
import { Suspense } from "react"

import { KindSurface, moduleKinds } from "@/components/kinds/kind-surface"

export const metadata: Metadata = {
  title: `${moduleKinds.routinePeriods.title} (Admin) · SMS Admin`,
}

// The list reads its filters from the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense>
      <KindSurface kind="routinePeriods" surface="Admin" />
    </Suspense>
  )
}
