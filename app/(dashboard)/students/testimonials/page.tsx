import type { Metadata } from "next"
import { Suspense } from "react"

import { TestimonialList } from "@/components/students/testimonial-list"

export const metadata: Metadata = {
  title: "Manage testimonial · SMS Admin",
}

// The filters live in the URL, which needs a Suspense boundary on a static page.
export default function TestimonialsPage() {
  return (
    <Suspense>
      <TestimonialList />
    </Suspense>
  )
}
