import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { TestimonialCollectionSheet } from "@/components/reports/testimonial-collection-sheet"

export const metadata: Metadata = {
  title: "Testimonial Collection Sheet · SMS Admin",
}

// Read-only, so any surface of "testimonial-collection-sheet" may see it. The
// filter lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function TestimonialCollectionSheetPage() {
  return (
    <RequireSurface resource="testimonial-collection-sheet" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <TestimonialCollectionSheet />
      </Suspense>
    </RequireSurface>
  )
}
