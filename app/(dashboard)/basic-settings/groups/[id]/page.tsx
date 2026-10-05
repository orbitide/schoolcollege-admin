import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupDetail } from "@/components/basic-settings/lookup/lookup-detail"

export const metadata: Metadata = {
  title: "Academic Group details · SMS Admin",
}

export default async function Page({ params }: PageProps<"/basic-settings/groups/[id]">) {
  const { id } = await params

  return (
    <Suspense>
      <LookupDetail lookup="groups" id={Number(id)} />
    </Suspense>
  )
}
