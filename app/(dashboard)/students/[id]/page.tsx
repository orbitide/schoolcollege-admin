import type { Metadata } from "next"

import { StudentProfile } from "@/components/students/student-profile"

export const metadata: Metadata = {
  title: "Student · SMS Admin",
}

export default async function StudentPage({ params }: PageProps<"/students/[id]">) {
  const { id } = await params

  return <StudentProfile id={Number(id)} />
}
