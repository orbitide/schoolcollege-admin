import type { Metadata } from "next"
import { Suspense } from "react"

import { TestimonialPrint } from "@/components/students/testimonial-print"

export const metadata: Metadata = {
  title: "Testimonial · SMS Admin",
}

// Outside the dashboard layout so only the certificates print. Reads its
// filters from the URL, which needs a Suspense boundary on a static page.
export default function TestimonialPrintPage() {
  return (
    <Suspense>
      <TestimonialPrint />
    </Suspense>
  )
}
