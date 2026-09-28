import type { Metadata } from "next"

import { DistrictForm } from "@/components/basic-settings/district-form"

export const metadata: Metadata = {
  title: "Add district · SMS Admin",
}

export default function NewDistrictPage() {
  return <DistrictForm />
}
