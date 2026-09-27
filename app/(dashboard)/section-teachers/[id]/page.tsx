import type { Metadata } from "next"

import { SectionTeacherDetail } from "@/components/section-teachers/section-teacher-detail"

export const metadata: Metadata = {
  title: "Section teacher · SMS Admin",
}

export default async function SectionTeacherPage({ params }: PageProps<"/section-teachers/[id]">) {
  const { id } = await params

  return <SectionTeacherDetail classId={Number(id)} />
}
