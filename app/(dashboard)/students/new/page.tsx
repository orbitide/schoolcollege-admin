import type { Metadata } from "next"
import { Suspense } from "react"

import { StudentForm } from "@/components/students/student-form"

export const metadata: Metadata = {
  title: "Add student · SMS Admin",
}

// The form reads the chosen institute from the URL (?institute=), which
// needs a Suspense boundary on this otherwise static page.
export default function NewStudentPage() {
  return (
    <Suspense>
      <StudentForm />
    </Suspense>
  )
}
