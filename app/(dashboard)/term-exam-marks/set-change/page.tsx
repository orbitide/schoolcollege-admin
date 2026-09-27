import type { Metadata } from "next"

import { MarksSetChange } from "@/components/term-exam-marks/marks-set-change"

export const metadata: Metadata = {
  title: "Student marks set change · SMS Admin",
}

export default function MarksSetChangePage() {
  return <MarksSetChange />
}
