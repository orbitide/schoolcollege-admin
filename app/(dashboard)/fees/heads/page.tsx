import type { Metadata } from "next"
import { Suspense } from "react"

import { KindSurface, moduleKinds } from "@/components/kinds/kind-surface"

export const metadata: Metadata = {
  title: `${moduleKinds.feeHeads.title} · SMS Admin`,
}

// The list reads its filters from the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense>
      <KindSurface kind="feeHeads" surface="Manage" />
    </Suspense>
  )
}
