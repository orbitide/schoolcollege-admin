import type { Metadata } from "next"

import { MaintenanceModeForm } from "@/components/settings/maintenance-mode-form"

export const metadata: Metadata = {
  title: "Maintenance Mode · SMS Admin",
}

export default function Page() {
  return <MaintenanceModeForm />
}
