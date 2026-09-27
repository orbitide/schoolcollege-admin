import type { Metadata } from "next"

import { TeacherForm } from "@/components/teachers/teacher-form"

export const metadata: Metadata = {
  title: "Add teacher · SMS Admin",
}

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

// ?institute= preselects the institute.
export default async function NewTeacherPage({
  searchParams,
}: PageProps<"/teachers/new">) {
  const query = await searchParams

  return (
    <TeacherForm
      instituteId={Number(one(query.institute)) || undefined}
      returnTo={one(query.returnTo)}
    />
  )
}
