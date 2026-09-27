import type { Metadata } from "next"

import { ClearStudents } from "@/components/students/clear-students"

export const metadata: Metadata = {
  title: "Student clear · SMS Admin",
}

export default function ClearStudentsPage() {
  return <ClearStudents />
}
