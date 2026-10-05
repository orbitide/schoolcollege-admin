import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupForm } from "@/components/basic-settings/lookup/lookup-form"

export const metadata: Metadata = {
  title: "Add Academic Group · SMS Admin",
}

export default function Page() {
  return (
    <Suspense>
      <LookupForm lookup="groups" />
    </Suspense>
  )
}
