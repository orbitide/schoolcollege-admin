"use client"

import * as React from "react"
import Link from "next/link"
import { MegaphoneIcon, PaperclipIcon, PinIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { classStore } from "@/lib/academic-store"
import { useCan } from "@/lib/access"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { boardNotices, useAllNotices } from "@/lib/notices"
import { cn } from "@/lib/utils"

const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

// Notice › Notice Board: the live notices of the user's institutes, pinned
// first then newest. A teacher sees those for everyone and for teachers.
export function NoticeBoard() {
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const notices = useAllNotices()
  const classes = classStore.useAll()
  const can = useCan()
  const [today] = React.useState(() => new Date().toISOString().slice(0, 10))
  const forTeacher = user.role === "Teacher"
  const live = boardNotices(notices, institutes.map((i) => i.id), forTeacher, today)
  const instituteName = new Map(institutes.map((i) => [i.id, i.shortName || i.name]))
  const className = new Map(classes.map((c) => [c.id, c.name]))
  const manage = can("notice.manage") || can("notice.admin")

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Notice Board</h2>
        <p className="text-sm text-muted-foreground">
          {live.length} notice{live.length === 1 ? "" : "s"} up today
          {manage && (
            <>
              {" · "}
              <Link href="/notices" className="underline">
                Manage notices
              </Link>
            </>
          )}
        </p>
      </div>
      {live.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {live.map((n) => (
            <Card key={n.id} className={cn(n.isPinned && "border-amber-500/50", n.category === "Urgent" && "border-destructive/60")}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  {n.isPinned && <PinIcon className="size-4 text-amber-500" />}
                  <Badge variant={n.category === "Urgent" ? "destructive" : "outline"}>{n.category}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {dateLabel(n.publishDate)}
                    {institutes.length > 1 && ` · ${instituteName.get(n.instituteId)}`}
                  </span>
                </div>
                <CardTitle className="text-base">{n.title}</CardTitle>
                <CardDescription>
                  For {n.audience.toLowerCase()}
                  {n.audience !== "Teachers" &&
                    n.classIds.length > 0 &&
                    ` of ${n.classIds.map((id) => className.get(id) ?? "—").join(", ")}`}
                  {n.expiryDate && ` · until ${dateLabel(n.expiryDate)}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{n.body}</p>
                {n.attachmentName && (
                  <a
                    href={n.attachmentUrl}
                    download={n.attachmentName}
                    className="inline-flex w-fit items-center gap-2 text-sm underline"
                  >
                    <PaperclipIcon className="size-4" />
                    {n.attachmentName}
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <MegaphoneIcon className="size-8" />
          <p className="text-sm">No notice is up today.</p>
        </div>
      )}
    </div>
  )
}
