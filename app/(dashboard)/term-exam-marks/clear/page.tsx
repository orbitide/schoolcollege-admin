import type { Metadata } from "next"

import { MarksClear } from "@/components/term-exam-marks/marks-clear"

export const metadata: Metadata = {
  title: "Marks clear · SMS Admin",
}

export default function MarksClearPage() {
  return <MarksClear />
}
