import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { YearBook } from "@/components/reports/year-book"

export const metadata: Metadata = {
  title: "Year Book · SMS Admin",
}

// Read-only, so any surface of "year-book" may see it. The filter lives in
// the URL, which needs a Suspense boundary on this otherwise static page.
export default function YearBookPage() {
  return (
    <RequireSurface resource="year-book" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <YearBook />
      </Suspense>
    </RequireSurface>
  )
}
