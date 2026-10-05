import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupDetail } from "@/components/basic-settings/lookup/lookup-detail"

export const metadata: Metadata = {
  title: "Academic Year details · SMS Admin",
}

export default async function Page({ params }: PageProps<"/basic-settings/years/[id]">) {
  const { id } = await params

  return (
    <Suspense>
      <LookupDetail lookup="years" id={Number(id)} />
    </Suspense>
  )
}
