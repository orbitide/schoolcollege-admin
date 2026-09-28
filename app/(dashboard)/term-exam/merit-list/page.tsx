import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { MeritListGenerate } from "@/components/term-exams/merit-list-generate"

export const metadata: Metadata = {
  title: "Merit list generation · SMS Admin",
}

// Generating needs the Manage (or Admin) surface of "merit-list"; viewers
// can't. The page reads its filters from the URL, which needs a Suspense
// boundary on this otherwise static page.
export default function MeritListPage() {
  return (
    <RequireSurface resource="merit-list" surface={["Admin", "Manage"]}>
      <Suspense>
        <MeritListGenerate />
      </Suspense>
    </RequireSurface>
  )
}
