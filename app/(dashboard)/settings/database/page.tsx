import type { Metadata } from "next"

import { DatabaseManager } from "@/components/settings/database-manager"

export const metadata: Metadata = {
  title: "Database · SMS Admin",
}

export default function Page() {
  return <DatabaseManager />
}
