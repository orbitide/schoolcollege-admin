import type { Metadata } from "next"

import { StudentImport } from "@/components/students/student-import"

export const metadata: Metadata = {
  title: "Student import · SMS Admin",
}

export default function StudentImportPage() {
  return <StudentImport />
}
