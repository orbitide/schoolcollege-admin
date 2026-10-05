import type { Metadata } from "next"
import { Suspense } from "react"

import { LookupDetail } from "@/components/basic-settings/lookup/lookup-detail"

export const metadata: Metadata = {
  title: "Student Category details · SMS Admin",
}

export default async function Page({ params }: PageProps<"/basic-settings/categories/[id]">) {
  const { id } = await params

  return (
    <Suspense>
      <LookupDetail lookup="categories" id={Number(id)} />
    </Suspense>
  )
}
