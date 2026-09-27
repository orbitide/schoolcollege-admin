import type { Metadata } from "next"

import { InstitutesView } from "@/components/institutes/institutes-view"

export const metadata: Metadata = {
  title: "Institutes · SMS Admin",
}

export default function InstitutesPage() {
  return <InstitutesView />
}
