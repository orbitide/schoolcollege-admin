import type { Metadata } from "next"
import { Suspense } from "react"

import { PassFailRegenerate } from "@/components/term-exam-marks/pass-fail-regenerate"

export const metadata: Metadata = {
  title: "Pass fail regenerate · SMS Admin",
}

// The page reads its filters from the URL, which needs a Suspense boundary
// on this otherwise static page.
export default function PassFailRegeneratePage() {
  return (
    <Suspense>
      <PassFailRegenerate />
    </Suspense>
  )
}
