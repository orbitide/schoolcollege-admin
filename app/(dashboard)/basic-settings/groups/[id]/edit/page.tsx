import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupForm } from "@/components/basic-settings/lookup/lookup-form"

export const metadata: Metadata = {
  title: "Edit Academic Group · SMS Admin",
}

export default async function Page({ params }: PageProps<"/basic-settings/groups/[id]/edit">) {
  const { id } = await params

  return (
    <Suspense>
      <LookupForm lookup="groups" id={Number(id)} />
    </Suspense>
  )
}
