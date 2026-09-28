import type { Metadata } from "next"

import { RequireSurface } from "@/components/require-surface"
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
    <RequireSurface resource="teacher" surface={["Admin", "Manage"]}>
      <TeacherForm
        instituteId={Number(one(query.institute)) || undefined}
        returnTo={one(query.returnTo)}
      />
    </RequireSurface>
  )
}
