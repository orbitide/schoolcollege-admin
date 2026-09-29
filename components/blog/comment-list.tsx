"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArchiveRestoreIcon,
  BanIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  AuditDate,
  COMMENT_RESOURCE,
  COMMENTS_HREF,
  CommentStatusBadge,
  MY_POSTS_HREF,
  POST_RESOURCE,
  POSTS_HREF,
  RowActions,
  withReturn,
} from "@/components/blog/blog-shared"
import { StatusBadge } from "@/components/institutes/status-badge"
import { SurfaceTabs } from "@/components/surface-tabs"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { capabilitiesFor, useSurfaces, type AccessSurface } from "@/lib/access"
import {
  commentStatuses,
  deleteComment,
  deleteCommentPermanently,
  retrieveComment,
  setCommentStatus,
  useAllComments,
  type BlogComment,
  type CommentStatus,
} from "@/lib/blog-comments"
import { postTitle, useAllPosts } from "@/lib/blog-posts"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { cn } from "@/lib/utils"

const titles: Record<AccessSurface, string> = {
  Admin: "Manage Comments (Admin)",
  Manage: "Manage Comments",
  View: "View Comments",
}

const statusAction: Record<CommentStatus, { label: string; icon: React.ReactNode }> = {
  Pending: { label: "Mark pending", icon: <ClockIcon /> },
  Approved: { label: "Approve", icon: <CircleCheckIcon /> },
  Rejected: { label: "Reject", icon: <CircleXIcon /> },
  Spam: { label: "Mark spam", icon: <BanIcon /> },
}

// Legacy Comments/Manage (and, with `mine`, CommentsAuthor/Manage "My
// Comments"): comments on the posts of the user's institutes, newest first.
// Moderators move a comment between Pending, Approved, Rejected and Spam
// (only Approved ones show on the post). My Comments lists the user's own,
// which they can delete but not approve.
export function CommentList({ surface, mine = false }: { surface: AccessSurface; mine?: boolean }) {
  const base = capabilitiesFor(surface, { resource: COMMENT_RESOURCE, softDelete: true })
  const can = mine ? { ...base, edit: false, status: false, restore: false } : base
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const comments = useAllComments()
  const posts = useAllPosts()
  const postSurfaces = useSurfaces(POST_RESOURCE)
  const canPick = institutes.length > 1

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const commentStatus = param("status")
  const withDeleted = can.restore && param("deleted") === "1"
  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()

  const instituteOf = new Map(institutes.map((i) => [i.id, i]))
  const postOf = new Map(posts.map((p) => [p.id, p]))
  const rows = comments
    .filter(
      (c) =>
        instituteOf.has(c.instituteId) &&
        (!mine || c.authorId === user.id) &&
        (!institute || c.instituteId === institute.id) &&
        (!commentStatus || c.commentStatus === commentStatus) &&
        (withDeleted || c.status !== "Deleted") &&
        (!needle ||
          c.content.toLowerCase().includes(needle) ||
          c.authorName.toLowerCase().includes(needle) ||
          postTitle(postOf.get(c.postId) ?? { translations: {} }).toLowerCase().includes(needle))
    )
    .sort(
      (a, b) =>
        Number(a.status === "Deleted") - Number(b.status === "Deleted") ||
        b.createdAt.localeCompare(a.createdAt)
    )

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`
  const showInstitute = !institute
  const postHref = (comment: BlogComment) => {
    const post = postOf.get(comment.postId)
    if (postSurfaces.length) return `${POSTS_HREF}/${comment.postId}`
    return post?.authorId === user.id && post.status !== "Deleted" ? `${MY_POSTS_HREF}/${comment.postId}` : null
  }

  function actions(comment: BlogComment) {
    const deleted = comment.status === "Deleted"
    return [
      !deleted &&
        can.edit && { label: "Edit", icon: <PencilIcon />, href: withReturn(`${COMMENTS_HREF}/${comment.id}/edit`, returnTo) },
      ...(!deleted && can.status
        ? commentStatuses
            .filter((s) => s !== comment.commentStatus)
            .map((s) => ({
              ...statusAction[s],
              onSelect: () => {
                setCommentStatus(comment.id, s, user.name)
                toast.success(`Comment marked ${s.toLowerCase()}`)
              },
            }))
        : []),
      deleted &&
        can.restore && {
          label: "Retrieve",
          icon: <ArchiveRestoreIcon />,
          onSelect: () => retrieveComment(comment.id, user.name),
          confirm: { title: "Retrieve this comment?", description: "It comes back with the status it had.", done: "Comment retrieved successfully" },
        },
      can.delete && {
        label: deleted ? "Permanent Delete" : "Delete",
        icon: <Trash2Icon />,
        destructive: true,
        separated: true,
        onSelect: () => (deleted ? deleteCommentPermanently(comment.id) : deleteComment(comment.id, user.name)),
        confirm: deleted
          ? { title: "Permanently delete this comment?", description: "It is removed for good. This cannot be undone.", done: "Comment deleted successfully" }
          : { title: "Delete this comment?", description: "It is taken off the post. An admin can retrieve it later from “With Deleted”.", done: "Comment deleted successfully" },
      },
    ]
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{mine ? "My Comments" : titles[surface]}</CardTitle>
            <CardDescription>
              {mine
                ? "Comments you have written. They show on the post once a moderator approves them."
                : "Only approved comments show on the post."}
            </CardDescription>
          </div>
          {!mine && <SurfaceTabs resource={COMMENT_RESOURCE} baseUrl={COMMENTS_HREF} current={surface} />}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canPick && (
            <FilterField
              label="Institute"
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              allLabel="All Institute"
            />
          )}
          <FilterField
            label="Comment Status"
            value={commentStatus}
            onChange={(v) => setParam({ status: v })}
            options={commentStatuses.map((s) => ({ value: s, label: s }))}
            allLabel="All Comment Status"
          />
          {can.restore && (
            <FilterField
              label="Status"
              value={withDeleted ? "1" : "0"}
              onChange={(v) => setParam({ deleted: v === "1" ? "1" : "" })}
              options={[
                { value: "0", label: "Without Deleted" },
                { value: "1", label: "With Deleted" },
              ]}
            />
          )}
          <div className="flex flex-col justify-end">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search comment, author or post"
                aria-label="Search comments"
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12">Sl</TableHead>
              {showInstitute && <TableHead>Institute</TableHead>}
              <TableHead>Post</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Comment Status</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((comment, index) => {
                const owner = instituteOf.get(comment.instituteId)
                const post = postOf.get(comment.postId)
                const href = postHref(comment)
                const menu = actions(comment).filter(Boolean)
                return (
                  <TableRow key={comment.id} className={cn(comment.status === "Deleted" && "text-muted-foreground")}>
                    <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                    {showInstitute && <TableCell>{owner?.shortName || owner?.name || "—"}</TableCell>}
                    <TableCell className="min-w-40">
                      {post && href ? (
                        <Link href={href} className="font-medium underline-offset-4 hover:underline">
                          {postTitle(post)}
                        </Link>
                      ) : post ? (
                        postTitle(post)
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="max-w-md min-w-56">
                      <p className="line-clamp-3 whitespace-pre-wrap">{comment.content}</p>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{comment.authorName}</div>
                      {comment.email && <div className="text-muted-foreground">{comment.email}</div>}
                      {comment.website && <div className="text-muted-foreground">{comment.website}</div>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      <AuditDate row={comment} />
                    </TableCell>
                    <TableCell>
                      <CommentStatusBadge status={comment.commentStatus} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={comment.status} />
                    </TableCell>
                    <TableCell>{menu.length > 0 && <RowActions actions={menu} />}</TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8 + Number(showInstitute)} className="h-24 text-center text-muted-foreground">
                  No comment matches these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
