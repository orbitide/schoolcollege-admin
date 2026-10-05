import type { Metadata } from "next"
import { Suspense } from "react"

import { BranchDetail } from "@/components/branches/branch-detail"

export const metadata: Metadata = {
  title: "Branch details · SMS Admin",
}

export default async function BranchDetailPage({ params }: PageProps<"/basic-settings/branches/[id]">) {
  const { id } = await params

  return (
    <Suspense>
      <BranchDetail id={Number(id)} />
    </Suspense>
  )
}
