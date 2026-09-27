import type { Metadata } from "next"

import { DistrictList } from "@/components/basic-settings/district-list"

export const metadata: Metadata = {
  title: "Districts · SMS Admin",
}

export default function DistrictsPage() {
  return <DistrictList />
}
