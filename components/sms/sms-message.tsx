import { Badge } from "@/components/ui/badge"
import { smsLength } from "@/lib/sms-templates"
import { cn } from "@/lib/utils"

// A message with its [{Keyword}] placeholders picked out, so it reads as a
// template. Keywords listed in `unknown` are marked as problems.
export function HighlightedMessage({
  message,
  unknown = [],
  className,
}: {
  message: string
  unknown?: string[]
  className?: string
}) {
  const parts = message.split(/(\[\{[^[\]{}]+\}\])/g)
  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {parts.map((part, index) => {
        const keyword = /^\[\{(.+)\}\]$/.exec(part)?.[1]
        if (!keyword) return part
        const bad = unknown.includes(keyword)
        return (
          <mark
            key={index}
            className={cn(
              "rounded px-0.5 font-medium",
              bad
                ? "bg-destructive/15 text-destructive"
                : "bg-primary/10 text-primary dark:bg-primary/20"
            )}
          >
            {part}
          </mark>
        )
      })}
    </span>
  )
}

// "142 chars · 1 SMS", with a Unicode badge for Bangla (70 per SMS).
export function SmsLengthSummary({ text, className }: { text: string; className?: string }) {
  const { chars, parts, unicode } = smsLength(text)
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5 tabular-nums", className)}>
      <span>
        {chars} chars · {parts} SMS
      </span>
      {unicode && (
        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
          Unicode
        </Badge>
      )}
    </span>
  )
}
