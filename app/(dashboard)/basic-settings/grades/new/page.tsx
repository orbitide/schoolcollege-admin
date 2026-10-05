import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupForm } from "@/components/basic-settings/lookup/lookup-form"

export const metadata: Metadata = {
  title: "Add Letter Grade · SMS Admin",
}

export default function Page() {
  return (
    <Suspense>
      <LookupForm lookup="grades" />
    </Suspense>
  )
}
