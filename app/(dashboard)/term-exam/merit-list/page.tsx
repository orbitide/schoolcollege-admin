import type { Metadata } from "next"
import { Suspense } from "react"

import { MeritListGenerate } from "@/components/term-exams/merit-list-generate"

export const metadata: Metadata = {
  title: "Merit list generation · SMS Admin",
}

// The page reads its filters from the URL, which needs a Suspense boundary
// on this otherwise static page.
export default function MeritListPage() {
  return (
    <Suspense>
      <MeritListGenerate />
    </Suspense>
  )
}
