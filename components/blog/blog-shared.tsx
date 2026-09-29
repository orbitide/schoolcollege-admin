"use client"

import * as React from "react"
import Link from "next/link"
import { EllipsisVerticalIcon } from "lucide-react"
import { toast } from "sonner"

import { stamp } from "@/components/term-exams/term-exam-fields"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CommentStatus } from "@/lib/blog-comments"
import type { PostStatus } from "@/lib/blog-posts"
import { cn } from "@/lib/utils"

// Legacy NetCoreCMS Blog menu: the routes and the permission resources the
// sidebar (components/app-sidebar.tsx) gates them with.
export const POSTS_HREF = "/blog/posts"
export const POST_RESOURCE = "blog-post"
export const MY_POSTS_HREF = "/blog/my-posts"
export const AUTHOR_RESOURCE = "blog-author"
export const CATEGORIES_HREF = "/blog/categories"
export const CATEGORY_RESOURCE = "blog-category"
export const TAGS_HREF = "/blog/tags"
export const TAG_RESOURCE = "blog-tag"
export const COMMENTS_HREF = "/blog/comments"
export const COMMENT_RESOURCE = "blog-comment"
export const MY_COMMENTS_HREF = "/blog/my-comments"
export const MY_COMMENT_RESOURCE = "blog-my-comment"

// Only same-app paths are followed back.
export const backTo = (returnTo: string | undefined, fallback: string) =>
  returnTo?.startsWith("/") ? returnTo : fallback

export const withReturn = (href: string, returnTo: string) =>
  `${href}${href.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(returnTo)}`

export function NotFound({ title, href, label }: { title: string; href: string; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">It may have been deleted.</p>
      <Button asChild variant="outline" size="sm">
        <Link href={href}>{label}</Link>
      </Button>
    </div>
  )
}

type Audited = { createdBy: string; createdAt: string; modifiedBy: string; modifiedAt: string }

// The legacy grids' User and Date columns: "Cr:" / "Mo:" once edited.
export function AuditUser({ row }: { row: Audited }) {
  if (row.createdAt === row.modifiedAt) return <>{row.createdBy}</>
  return (
    <>
      <div>Cr: {row.createdBy}</div>
      <div>Mo: {row.modifiedBy}</div>
    </>
  )
}

export function AuditDate({ row }: { row: Audited }) {
  if (row.createdAt === row.modifiedAt) return <>{stamp(row.createdAt)}</>
  return (
    <>
      <div>Cr: {stamp(row.createdAt)}</div>
      <div>Mo: {stamp(row.modifiedAt)}</div>
    </>
  )
}

export function auditRows(row: Audited): [string, React.ReactNode][] {
  return [
    ["Created by", row.createdBy],
    ["Creation date", new Date(row.createdAt).toLocaleString("en-GB")],
    ["Modified by", row.modifiedBy],
    ["Modification date", new Date(row.modifiedAt).toLocaleString("en-GB")],
  ]
}

export function DetailRows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-y-3 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[9rem_1fr] gap-2">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium break-words">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

const postStatusTone: Record<PostStatus, string> = {
  Draft: "text-muted-foreground",
  Reviewed: "border-sky-500/40 text-sky-700 dark:text-sky-300",
  Published: "border-green-500/40 text-green-700 dark:text-green-300",
  UnPublished: "border-amber-500/40 text-amber-700 dark:text-amber-300",
  Archived: "text-muted-foreground",
}

export function PostStatusBadge({ status }: { status: PostStatus }) {
  return (
    <Badge variant="outline" className={cn("px-1.5", postStatusTone[status])}>
      {status === "UnPublished" ? "Unpublished" : status}
    </Badge>
  )
}

const commentStatusTone: Record<CommentStatus, string> = {
  Pending: "border-amber-500/40 text-amber-700 dark:text-amber-300",
  Approved: "border-green-500/40 text-green-700 dark:text-green-300",
  Rejected: "text-muted-foreground",
  Spam: "border-destructive/40 text-destructive",
}

export function CommentStatusBadge({ status }: { status: CommentStatus }) {
  return (
    <Badge variant="outline" className={cn("px-1.5", commentStatusTone[status])}>
      {status}
    </Badge>
  )
}

export type RowAction = {
  label: string
  icon: React.ReactNode
  href?: string
  // Returning false (e.g. a blocked delete) skips the `done` toast.
  onSelect?: () => void | boolean
  destructive?: boolean
  // Drawn after a separator (the destructive ones).
  separated?: boolean
  // Asked first; `done` is toasted after `onSelect` runs.
  confirm?: { title: string; description: string; done: string }
}

// A row's "⋮" menu. Pass `false` for actions the surface doesn't offer.
export function RowActions({ actions }: { actions: (RowAction | false | null | undefined)[] }) {
  const [pending, setPending] = React.useState<RowAction | null>(null)
  const shown = actions.filter((a): a is RowAction => !!a)
  const confirm = pending?.confirm

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground data-[state=open]:bg-muted"
          >
            <EllipsisVerticalIcon />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {shown.map((action, index) => (
            <React.Fragment key={action.label}>
              {action.separated && index > 0 && <DropdownMenuSeparator />}
              {action.href ? (
                <DropdownMenuItem asChild variant={action.destructive ? "destructive" : "default"}>
                  <Link href={action.href}>
                    {action.icon}
                    {action.label}
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  variant={action.destructive ? "destructive" : "default"}
                  onSelect={() => (action.confirm ? setPending(action) : action.onSelect?.())}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              )}
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setPending(null)}>
        {pending && confirm && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant={pending.destructive ? "destructive" : "default"}
                onClick={() => {
                  if (pending.onSelect?.() !== false) toast.success(confirm.done)
                  setPending(null)
                }}
              >
                {pending.label}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  )
}
