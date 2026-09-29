import { Badge } from "@/components/ui/badge"
import { noticeState, type Notice, type NoticeState } from "@/lib/notices"

const stateClass: Record<NoticeState, string> = {
  Live: "border-green-600/30 bg-green-500/10 text-green-700 dark:text-green-400",
  Scheduled: "border-sky-600/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  Expired: "text-muted-foreground",
  Inactive: "text-muted-foreground",
  Deleted: "border-red-600/30 text-destructive",
}

// Where a notice stands today: Live, Scheduled, Expired, Inactive or Deleted.
export function StateBadge({ notice }: { notice: Notice }) {
  const state = noticeState(notice)
  return (
    <Badge variant="outline" className={stateClass[state]}>
      {state}
    </Badge>
  )
}
