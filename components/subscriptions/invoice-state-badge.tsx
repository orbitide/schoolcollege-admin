import { AlertCircleIcon, CircleCheckIcon, CircleSlashIcon, ClockIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { InvoiceState } from "@/lib/saas-invoices"

export function InvoiceStateBadge({ state }: { state: InvoiceState }) {
  return (
    <Badge variant="outline" className="px-1.5 text-muted-foreground">
      {state === "Paid" ? (
        <CircleCheckIcon className="fill-green-500 text-background dark:fill-green-400" />
      ) : state === "Overdue" ? (
        <AlertCircleIcon className="text-destructive" />
      ) : state === "Void" ? (
        <CircleSlashIcon />
      ) : (
        <ClockIcon className="text-amber-500" />
      )}
      {state}
    </Badge>
  )
}
