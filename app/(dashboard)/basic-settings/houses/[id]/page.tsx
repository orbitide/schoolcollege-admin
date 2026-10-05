import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupDetail } from "@/components/basic-settings/lookup/lookup-detail"

export const metadata: Metadata = {
  title: "Student House details · SMS Admin",
}

export default async function Page({ params }: PageProps<"/basic-settings/houses/[id]">) {
  const { id } = await params

  return (
    <Suspense>
      <LookupDetail lookup="houses" id={Number(id)} />
    </Suspense>
  )
}
