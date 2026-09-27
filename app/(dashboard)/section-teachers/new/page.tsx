import type { Metadata } from "next"
import { Suspense } from "react"

import { SectionTeacherForm } from "@/components/section-teachers/section-teacher-form"

export const metadata: Metadata = {
  title: "Add section teacher · SMS Admin",
}

// ?institute= preselects the institute, read from the URL in the form.
export default function NewSectionTeacherPage() {
  return (
    <Suspense>
      <SectionTeacherForm />
    </Suspense>
  )
}
