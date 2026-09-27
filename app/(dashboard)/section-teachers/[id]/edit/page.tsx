import type { Metadata } from "next"
import { Suspense } from "react"

import { SectionTeacherForm } from "@/components/section-teachers/section-teacher-form"

export const metadata: Metadata = {
  title: "Edit section teacher · SMS Admin",
}

export default async function EditSectionTeacherPage({ params }: PageProps<"/section-teachers/[id]/edit">) {
  const { id } = await params

  return (
    <Suspense>
      <SectionTeacherForm classId={Number(id)} />
    </Suspense>
  )
}
