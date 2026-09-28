import type { Metadata } from "next"

import { DistrictForm } from "@/components/basic-settings/district-form"

export const metadata: Metadata = {
  title: "Edit district · SMS Admin",
}

export default async function EditDistrictPage({
  params,
}: PageProps<"/basic-settings/districts/[id]/edit">) {
  const { id } = await params
  return <DistrictForm id={Number(id)} />
}
