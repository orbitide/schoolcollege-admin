import {
  ArrowDownIcon,
  ArrowUpIcon,
  CircleCheckIcon,
  CircleDotIcon,
  CircleIcon,
  ClockIcon,
  LoaderIcon,
  MinusIcon,
  SirenIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { TicketPriority, TicketStatus } from "@/lib/support-tickets"

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant="outline" className="px-1.5 whitespace-nowrap text-muted-foreground">
      {status === "Open" ? (
        <CircleDotIcon className="text-blue-600 dark:text-blue-400" />
      ) : status === "In progress" ? (
        <LoaderIcon className="text-amber-500" />
      ) : status === "Waiting on institute" ? (
        <ClockIcon />
      ) : status === "Resolved" ? (
        <CircleCheckIcon className="fill-green-500 text-background dark:fill-green-400" />
      ) : (
        <CircleIcon />
      )}
      {status}
    </Badge>
  )
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge
      variant={priority === "Urgent" ? "destructive" : "outline"}
      className={priority === "Urgent" ? "px-1.5" : "px-1.5 text-muted-foreground"}
    >
      {priority === "Urgent" ? (
        <SirenIcon />
      ) : priority === "High" ? (
        <ArrowUpIcon className="text-destructive" />
      ) : priority === "Low" ? (
        <ArrowDownIcon />
      ) : (
        <MinusIcon />
      )}
      {priority}
    </Badge>
  )
}
