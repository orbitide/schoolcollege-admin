import type { Metadata } from "next"

import { StudentForm } from "@/components/students/student-form"

export const metadata: Metadata = {
  title: "Transfer student · SMS Admin",
}

export default async function TransferStudentPage({
  params,
}: PageProps<"/students/[id]/transfer">) {
  const { id } = await params

  return <StudentForm studentId={Number(id)} transfer />
}
