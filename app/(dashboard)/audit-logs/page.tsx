import type { Metadata } from "next"

import { AuditLogList } from "@/components/audit-logs/audit-log-list"
import { RequirePlatform } from "@/components/require-platform"

export const metadata: Metadata = {
  title: "Audit logs · SMS Admin",
}

export default function Page() {
  return (
    <RequirePlatform>
      <AuditLogList />
    </RequirePlatform>
  )
}
