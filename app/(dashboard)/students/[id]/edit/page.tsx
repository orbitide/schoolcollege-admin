import type { Metadata } from "next"

import { StudentForm } from "@/components/students/student-form"

export const metadata: Metadata = {
  title: "Edit student · SMS Admin",
}

export default async function EditStudentPage({
  params,
}: PageProps<"/students/[id]/edit">) {
  const { id } = await params

  return <StudentForm studentId={Number(id)} />
}
