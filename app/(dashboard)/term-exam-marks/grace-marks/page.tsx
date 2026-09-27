import type { Metadata } from "next"

import { SubjectGraceMarks } from "@/components/term-exam-marks/subject-grace-marks"

export const metadata: Metadata = {
  title: "Grace marks · SMS Admin",
}

export default function SubjectGraceMarksPage() {
  return <SubjectGraceMarks />
}
