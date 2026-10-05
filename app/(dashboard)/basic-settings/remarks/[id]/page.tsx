import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupDetail } from "@/components/basic-settings/lookup/lookup-detail"

export const metadata: Metadata = {
  title: "Result Remarks details · SMS Admin",
}

export default async function Page({ params }: PageProps<"/basic-settings/remarks/[id]">) {
  const { id } = await params

  return (
    <Suspense>
      <LookupDetail lookup="remarks" id={Number(id)} />
    </Suspense>
  )
}
