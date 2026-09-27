import type { Metadata } from "next"
import { Suspense } from "react"

import { SectionTeacherList } from "@/components/section-teachers/section-teacher-list"

export const metadata: Metadata = {
  title: "Section teachers · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary
// on this otherwise static page.
export default function SectionTeachersPage() {
  return (
    <Suspense>
      <SectionTeacherList />
    </Suspense>
  )
}
