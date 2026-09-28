import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { placeholder, smsKeywords, smsLength, type SmsType } from "@/lib/sms-templates"
import { cn } from "@/lib/utils"

// The keywords an SMS type fills, as chips that put [{Keyword}] in the
// message (legacy SMS Keywords list). `withSubjectOnly` false hides the
// result keywords that need a subject, as legacy Send SMS does until one
// is picked.
export function KeywordPicker({
  type,
  onPick,
  withSubjectOnly = true,
}: {
  type: SmsType | ""
  onPick: (keyword: string) => void
  withSubjectOnly?: boolean
}) {
  const keywords = smsKeywords(type).filter((k) => withSubjectOnly || !k.group)
  const groups = [...new Set(keywords.map((k) => k.group ?? ""))]
  return (
    <>
      {groups.map((group) => (
        <div key={group || "main"} className="flex flex-col gap-2">
          {group && (
            <p className="text-xs text-muted-foreground">
              {group}: filled only when the result SMS is sent for one subject.
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {keywords
              .filter((k) => (k.group ?? "") === group)
              .map((k) => (
                <Button
                  key={k.label}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 font-mono text-xs"
                  onClick={() => onPick(k.label)}
                >
                  {placeholder(k.label)}
                </Button>
              ))}
          </div>
        </div>
      ))}
    </>
  )
}

// Puts `[{keyword}]` at the textarea's cursor (replacing any selection) and
// leaves the cursor after it. Returns the new text.
export function insertAtCursor(
  area: HTMLTextAreaElement | null,
  text: string,
  keyword: string
) {
  const value = placeholder(keyword)
  const start = area?.selectionStart ?? text.length
  const end = area?.selectionEnd ?? text.length
  requestAnimationFrame(() => {
    area?.focus()
    area?.setSelectionRange(start + value.length, start + value.length)
  })
  return text.slice(0, start) + value + text.slice(end)
}

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
