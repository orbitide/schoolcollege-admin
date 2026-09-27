import { BanIcon, CircleCheckIcon, CircleMinusIcon, LoaderIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { InstituteStatus, RecordStatus } from "@/lib/institutes"

export function StatusBadge({
  status,
}: {
  status: InstituteStatus | RecordStatus
}) {
  return (
    <Badge variant="outline" className="px-1.5 text-muted-foreground">
      {status === "Active" ? (
        <CircleCheckIcon className="fill-green-500 text-background dark:fill-green-400" />
      ) : status === "Suspended" ? (
        <BanIcon className="text-destructive" />
      ) : status === "Inactive" ? (
        <CircleMinusIcon />
      ) : (
        <LoaderIcon className="text-amber-500" />
      )}
      {status}
    </Badge>
  )
}
