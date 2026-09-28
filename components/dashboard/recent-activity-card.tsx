"use client"

import Link from "next/link"
import { HistoryIcon } from "lucide-react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useCan } from "@/lib/access"
import { useCommonLogs, type CommonLog } from "@/lib/common-log"

const SHOWN = 8

const actionOf = (log: CommonLog) =>
  log.entityStatus === "Permanent Delete"
    ? "permanently deleted"
    : log.entityStatus === "Deleted"
      ? "deleted"
      : "saved"

// The name a log row's record went by, when its saved JSON has one.
function nameOf(log: CommonLog) {
  try {
    const row = JSON.parse(log.objectJson) as { name?: unknown }
    return typeof row.name === "string" && row.name ? row.name : null
  } catch {
    return null
  }
}

function timeAgo(iso: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return "just now"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return new Date(iso).toLocaleDateString()
}

// The latest changes from the Common Log, optionally only some tables
// (e.g. the platform's institutes and user links).
export function RecentActivityCard({
  tables,
  description,
}: {
  tables?: string[]
  description: string
}) {
  const logs = useCommonLogs()
  const can = useCan()
  const shown = (tables ? logs.filter((l) => tables.includes(l.tableName)) : logs).slice(0, SHOWN)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>{description}</CardDescription>
        {can("common-log.manage") && (
          <CardAction>
            <Button asChild variant="ghost" size="sm">
              <Link href="/basic-actions/common-log">View all</Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <HistoryIcon className="size-6" />
            No changes yet in this session.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {shown.map((log) => {
              const name = nameOf(log)
              return (
                <li key={log.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground/40" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">
                      <span className="font-medium">{log.createdBy}</span> {actionOf(log)}{" "}
                      {log.tableName} {name ? `“${name}”` : `#${log.rowId}`}
                    </span>
                    <span className="block text-xs text-muted-foreground">{timeAgo(log.createdAt)}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
