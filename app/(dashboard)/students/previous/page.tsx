import type { Metadata } from "next"
import { Suspense } from "react"

import { PreviousStudentSearch } from "@/components/students/previous-student-search"

export const metadata: Metadata = {
  title: "Add previous student · SMS Admin",
}

// The search reads its fields from the URL, which needs a Suspense boundary
// on this otherwise static page.
export default function PreviousStudentPage() {
  return (
    <Suspense>
      <PreviousStudentSearch />
    </Suspense>
  )
}
