import { BanIcon, CircleCheckIcon, LoaderIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { InstituteStatus } from "@/lib/institutes"

export function StatusBadge({ status }: { status: InstituteStatus }) {
  return (
    <Badge variant="outline" className="px-1.5 text-muted-foreground">
      {status === "Active" ? (
        <CircleCheckIcon className="fill-green-500 text-background dark:fill-green-400" />
      ) : status === "Suspended" ? (
        <BanIcon className="text-destructive" />
      ) : (
        <LoaderIcon className="text-amber-500" />
      )}
      {status}
    </Badge>
  )
}
