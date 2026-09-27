import type { Metadata } from "next"

import { TeacherForm } from "@/components/teachers/teacher-form"

export const metadata: Metadata = {
  title: "Edit teacher · SMS Admin",
}

export default async function EditTeacherPage({
  params,
  searchParams,
}: PageProps<"/teachers/[id]/edit">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <TeacherForm
      teacherId={Number(id)}
      returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo}
    />
  )
}
