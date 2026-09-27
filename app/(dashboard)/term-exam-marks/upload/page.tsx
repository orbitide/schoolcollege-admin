import type { Metadata } from "next"

import { MarksUpload } from "@/components/term-exam-marks/marks-upload"

export const metadata: Metadata = {
  title: "Upload term exam marks · SMS Admin",
}

export default function MarksUploadPage() {
  return <MarksUpload />
}
