import { Badge } from "@/components/ui/badge"
import type { QuestionStatus } from "@/lib/question-bank"
import { cn } from "@/lib/utils"

const tones: Record<QuestionStatus, string> = {
  Draft: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Retired: "text-muted-foreground",
  Deleted: "border-destructive/40 text-destructive",
}

export function QuestionStatusBadge({ status, className }: { status: QuestionStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(tones[status], className)}>
      {status}
    </Badge>
  )
}
