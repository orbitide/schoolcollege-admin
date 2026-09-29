"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, PaperclipIcon, PencilIcon, PinIcon } from "lucide-react"

import { StateBadge } from "@/components/notices/notice-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { classStore } from "@/lib/academic-store"
import { surfaceHref, useSurfaces } from "@/lib/access"
import { useInstitute } from "@/lib/institutes-store"
import { useNotice } from "@/lib/notices"

// Notice details, deleted ones included.
export function NoticeDetail({ id, returnTo }: { id: number; returnTo?: string }) {
  const notice = useNotice(id)
  const institute = useInstitute(notice?.instituteId ?? -1)
  const classes = classStore.useAll()
  const surfaces = useSurfaces("notice")
  const canEdit = surfaces.some((s) => s !== "View")
  const listHref = returnTo?.startsWith("/") ? returnTo : surfaceHref("/notices", surfaces[0] ?? "View")

  if (!notice) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Notice not found</h2>
        <p className="text-sm text-muted-foreground">It may have been permanently deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>Back to notices</Link>
        </Button>
      </div>
    )
  }

  const rows: [string, React.ReactNode][] = [
    ["Institute", institute?.name ?? "—"],
    ["Category", notice.category],
    [
      "For",
      notice.audience +
        (notice.audience !== "Teachers" && notice.classIds.length
          ? ` (${notice.classIds.map((c) => classes.find((x) => x.id === c)?.name ?? "—").join(", ")})`
          : ""),
    ],
    ["Publish date", notice.publishDate],
    ["Expiry date", notice.expiryDate || "Until made inactive"],
    ["SMS sent", notice.smsCount || "None"],
    ["Created by", `${notice.createdBy}, ${new Date(notice.createdAt).toLocaleString("en-GB")}`],
    ["Modified by", `${notice.modifiedBy}, ${new Date(notice.modifiedAt).toLocaleString("en-GB")}`],
  ]

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={listHref}>
            <ArrowLeftIcon data-icon="inline-start" />
            Notices
          </Link>
        </Button>
        {notice.status !== "Deleted" && canEdit && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/notices/${notice.id}/edit?returnTo=${encodeURIComponent(listHref)}`}>
              <PencilIcon data-icon="inline-start" />
              Edit
            </Link>
          </Button>
        )}
      </div>
      <Card className="max-w-3xl">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center gap-2">
            {notice.isPinned && <PinIcon className="size-4 text-amber-500" />}
            <CardTitle className="text-lg">{notice.title}</CardTitle>
            <StateBadge notice={notice} />
            {notice.status === "Inactive" && <Badge variant="outline">Inactive</Badge>}
          </div>
          <CardDescription>{notice.category} notice</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{notice.body}</p>
          {notice.attachmentName && (
            <a
              href={notice.attachmentUrl}
              download={notice.attachmentName}
              className="inline-flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              <PaperclipIcon className="size-4" />
              {notice.attachmentName}
            </a>
          )}
          <dl className="grid gap-y-3 border-t pt-4 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[10rem_1fr] gap-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
