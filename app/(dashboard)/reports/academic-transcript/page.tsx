import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { AcademicTranscript } from "@/components/reports/academic-transcript"

export const metadata: Metadata = {
  title: "Academic Transcript · SMS Admin",
}

// Read-only, so any surface of "academic-transcript" may see it. The filter
// lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function AcademicTranscriptPage() {
  return (
    <RequireSurface resource="academic-transcript" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <AcademicTranscript />
      </Suspense>
    </RequireSurface>
  )
}
