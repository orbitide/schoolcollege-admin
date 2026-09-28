import type { Metadata } from "next"

import { RequireSurface } from "@/components/require-surface"
import { TeacherDetail } from "@/components/teachers/teacher-detail"

export const metadata: Metadata = {
  title: "Teacher · SMS Admin",
}

export default async function TeacherPage({
  params,
  searchParams,
}: PageProps<"/teachers/[id]">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <RequireSurface resource="teacher" surface={["Admin", "Manage", "View"]}>
      <TeacherDetail
        id={Number(id)}
        returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo}
      />
    </RequireSurface>
  )
}
