import type { Metadata } from "next"

import { DatabaseManager } from "@/components/platform-tools/database-manager"
import { RequirePlatform } from "@/components/require-platform"

export const metadata: Metadata = {
  title: "Database · SMS Admin",
}

export default function Page() {
  return (
    <RequirePlatform>
      <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Database</h2>
          <p className="text-sm text-muted-foreground">Keep the database schema in step with the application.</p>
        </div>
        <DatabaseManager />
      </div>
    </RequirePlatform>
  )
}
