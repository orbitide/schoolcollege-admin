import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { AdmitCard } from "@/components/reports/admit-card"

export const metadata: Metadata = {
  title: "Admit Card · SMS Admin",
}

// Read-only, so any surface of "admit-card" may see it. The filter lives in
// the URL, which needs a Suspense boundary on this otherwise static page.
export default function AdmitCardPage() {
  return (
    <RequireSurface resource="admit-card" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <AdmitCard />
      </Suspense>
    </RequireSurface>
  )
}
