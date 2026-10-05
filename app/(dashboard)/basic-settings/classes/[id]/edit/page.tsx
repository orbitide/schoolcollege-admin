import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupForm } from "@/components/basic-settings/lookup/lookup-form"

export const metadata: Metadata = {
  title: "Edit Academic Class · SMS Admin",
}

export default async function Page({ params }: PageProps<"/basic-settings/classes/[id]/edit">) {
  const { id } = await params

  return (
    <Suspense>
      <LookupForm lookup="classes" id={Number(id)} />
    </Suspense>
  )
}
