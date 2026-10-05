import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupDetail } from "@/components/basic-settings/lookup/lookup-detail"

export const metadata: Metadata = {
  title: "Academic Class details · SMS Admin",
}

export default async function Page({ params }: PageProps<"/basic-settings/classes/[id]">) {
  const { id } = await params

  return (
    <Suspense>
      <LookupDetail lookup="classes" id={Number(id)} />
    </Suspense>
  )
}
