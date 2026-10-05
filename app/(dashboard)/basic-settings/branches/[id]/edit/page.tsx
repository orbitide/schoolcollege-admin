import type { Metadata } from "next"
import { Suspense } from "react"

import { BranchForm } from "@/components/branches/branch-form"

export const metadata: Metadata = {
  title: "Edit branch · SMS Admin",
}

export default async function EditBranchPage({ params }: PageProps<"/basic-settings/branches/[id]/edit">) {
  const { id } = await params

  return (
    <Suspense>
      <BranchForm id={Number(id)} />
    </Suspense>
  )
}
