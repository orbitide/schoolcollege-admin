import type { Metadata } from "next"

import { DistrictDetail } from "@/components/basic-settings/district-detail"

export const metadata: Metadata = {
  title: "District details · SMS Admin",
}

export default async function DistrictDetailPage({
  params,
}: PageProps<"/basic-settings/districts/[id]">) {
  const { id } = await params
  return <DistrictDetail id={Number(id)} />
}
