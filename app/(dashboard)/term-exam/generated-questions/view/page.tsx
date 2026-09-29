import type { Metadata } from "next"
import { Suspense } from "react"

import { GENERATED_PAPERS_RESOURCE, GeneratedPaperList } from "@/components/question-papers/generated-paper-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Generated questions (View) · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <RequireSurface resource={GENERATED_PAPERS_RESOURCE} surface="View">
      <Suspense>
        <GeneratedPaperList surface="View" />
      </Suspense>
    </RequireSurface>
  )
}
