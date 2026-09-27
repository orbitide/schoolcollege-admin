import type { Metadata } from "next"

import { MarksRecalculation } from "@/components/term-exam-marks/marks-recalculation"

export const metadata: Metadata = {
  title: "Marks recalculation · SMS Admin",
}

export default function MarksRecalculationPage() {
  return <MarksRecalculation />
}
