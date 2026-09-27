import type { Metadata } from "next"

import { TransferStudents } from "@/components/students/transfer-students"

export const metadata: Metadata = {
  title: "Student transfer · SMS Admin",
}

export default function TransferStudentsPage() {
  return <TransferStudents />
}
