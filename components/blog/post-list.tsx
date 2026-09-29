"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArchiveRestoreIcon,
  EyeIcon,
  PencilIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  StarIcon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  AuditUser,
  MY_POSTS_HREF,
  POST_RESOURCE,
  POSTS_HREF,
  PostStatusBadge,
  RowActions,
  withReturn,
} from "@/components/blog/blog-shared"
import { StatusBadge } from "@/components/institutes/status-badge"
import { SurfaceTabs } from "@/components/surface-tabs"
import { FilterField, stamp } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { capabilitiesFor, type AccessSurface } from "@/lib/access"
import { categoryName, categoryTree, useAllCategories } from "@/lib/blog-categories"
import {
  blogLanguages,
  deletePost,
  deletePostPermanently,
  postStatuses,
  postTitle,
  retrievePost,
  togglePublishPost,
  useAllPosts,
  visibilityLabel,
  type BlogPost,
} from "@/lib/blog-posts"
import { useAllTags } from "@/lib/blog-tags"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { cn } from "@/lib/utils"

const titles: Record<AccessSurface, string> = {
  Admin: "Manage Post (Admin)",
  Manage: "Manage Post",
  View: "View Post",
}

// Legacy Post/Manage (and, with `author`, PostAuthor/Manage "My Post"): the
// posts of the user's institutes, newest first. The surface decides the
// actions: Manage writes, publishes and deletes; Admin also sees deleted
// posts, retrieves them and deletes them for good; View only reads. My Post
// lists the user's own posts, which they may edit but not publish or delete.
export function PostList({ surface, author = false }: { surface: AccessSurface; author?: boolean }) {
  const base = capabilitiesFor(surface, { resource: POST_RESOURCE, softDelete: true })
  const can = author ? { ...base, status: false, delete: false, restore: false } : base
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const posts = useAllPosts()
  const categories = useAllCategories()
  const tags = useAllTags()
  const canPick = institutes.length > 1
  const href = author ? MY_POSTS_HREF : POSTS_HREF

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const postStatus = param("status")
  const categoryId = institute ? Number(param("category")) || null : null
  const withDeleted = can.restore && param("deleted") === "1"
  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()

  const categoryOf = new Map(categories.map((c) => [c.id, c]))
  const tagOf = new Map(tags.map((t) => [t.id, t]))
  const instituteOf = new Map(institutes.map((i) => [i.id, i]))
  const matches = (post: BlogPost) =>
    !needle ||
    Object.values(post.translations).some((t) => t?.title.toLowerCase().includes(needle)) ||
    post.categoryIds.some((id) => {
      const category = categoryOf.get(id)
      return !!category && categoryName(category).toLowerCase().includes(needle)
    }) ||
    post.tagIds.some((id) => tagOf.get(id)?.name.toLowerCase().includes(needle))

  const rows = posts
    .filter(
      (p) =>
        instituteOf.has(p.instituteId) &&
        (!author || p.authorId === user.id) &&
        (!institute || p.instituteId === institute.id) &&
        (!postStatus || p.postStatus === postStatus) &&
        (!categoryId || p.categoryIds.includes(categoryId)) &&
        (withDeleted || p.status !== "Deleted") &&
        matches(p)
    )
    .sort(
      (a, b) =>
        Number(a.status === "Deleted") - Number(b.status === "Deleted") ||
        (b.publishDate || b.modifiedAt).localeCompare(a.publishDate || a.modifiedAt)
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
  const newHref = withReturn(
    `${href}/new${institute ? `?institute=${institute.id}` : ""}`,
    returnTo
  )
  const showInstitute = !institute
  const columnCount = 10 + Number(showInstitute)

  function actions(post: BlogPost) {
    const deleted = post.status === "Deleted"
    const published = post.postStatus === "Published"
    const title = postTitle(post)
    return [
      { label: "Details", icon: <EyeIcon />, href: withReturn(`${href}/${post.id}`, returnTo) },
      !deleted &&
        can.edit && { label: "Edit", icon: <PencilIcon />, href: withReturn(`${href}/${post.id}/edit`, returnTo) },
      !deleted &&
        can.status && {
          label: published ? "Unpublish" : "Publish",
          icon: published ? <Undo2Icon /> : <SendIcon />,
          onSelect: () => {
            togglePublishPost(post.id, user.name)
            toast.success(published ? "Post moved to draft" : "Post published successfully")
          },
        },
      deleted &&
        can.restore && {
          label: "Retrieve",
          icon: <ArchiveRestoreIcon />,
          onSelect: () => retrievePost(post.id, user.name),
          confirm: { title: `Retrieve "${title}"?`, description: "It comes back as it was.", done: "Post retrieved successfully" },
        },
      can.delete && {
        label: deleted ? "Permanent Delete" : "Delete",
        icon: <Trash2Icon />,
        destructive: true,
        separated: true,
        onSelect: () => (deleted ? deletePostPermanently(post.id) : deletePost(post.id, user.name)),
        confirm: deleted
          ? { title: `Permanently delete "${title}"?`, description: "The post and its comments are removed for good. This cannot be undone.", done: "Post deleted successfully" }
          : { title: `Delete "${title}"?`, description: "It is taken off the site. An admin can retrieve it later from “With Deleted”.", done: "Post deleted successfully" },
      },
    ]
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{author ? "My Post" : titles[surface]}</CardTitle>
            <CardDescription>
              {author
                ? "Posts you have written. An editor publishes them."
                : "Blog posts, news and notices of your institutes."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!author && <SurfaceTabs resource={POST_RESOURCE} baseUrl={POSTS_HREF} current={surface} />}
            {can.create && institutes.length > 0 && (
              <Button asChild size="sm">
                <Link href={newHref}>
                  <PlusIcon data-icon="inline-start" />
                  {author ? "Create Post" : "New Post"}
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canPick && (
            <FilterField
              label="Institute"
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v, category: "" })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              allLabel="All Institute"
            />
          )}
          <FilterField
            label="Post Status"
            value={postStatus}
            onChange={(v) => setParam({ status: v })}
            options={postStatuses.map((s) => ({ value: s, label: s === "UnPublished" ? "Unpublished" : s }))}
            allLabel="All Post Status"
          />
          {institute && (
            <FilterField
              label="Category"
              value={categoryId ? String(categoryId) : ""}
              onChange={(v) => setParam({ category: v })}
              options={categoryTree(categories, institute.id).map(({ category, level }) => ({
                value: String(category.id),
                label: `${"— ".repeat(level)}${categoryName(category)}`,
              }))}
              allLabel="All Category"
            />
          )}
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
                placeholder="Search title, category or tag"
                aria-label="Search posts"
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
              <TableHead>Title</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Post Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((post, index) => {
                const deleted = post.status === "Deleted"
                const owner = instituteOf.get(post.instituteId)
                const published = post.postStatus === "Published"
                return (
                  <TableRow key={post.id} className={cn(deleted && "text-muted-foreground")}>
                    <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                    {showInstitute && <TableCell>{owner?.shortName || owner?.name || "—"}</TableCell>}
                    <TableCell className="min-w-56">
                      <Link
                        href={withReturn(`${href}/${post.id}`, returnTo)}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {postTitle(post)}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {blogLanguages
                          .filter((l) => post.translations[l.code])
                          .map((l) => (
                            <Badge key={l.code} variant="secondary" className="px-1.5 text-[0.7rem] uppercase">
                              {l.code}
                            </Badge>
                          ))}
                        {post.isFeatured && (
                          <Badge variant="outline" className="px-1.5 text-[0.7rem]">
                            <StarIcon className="fill-amber-400 text-amber-500" />
                            Featured
                          </Badge>
                        )}
                        {post.isSticky && (
                          <Badge variant="outline" className="px-1.5 text-[0.7rem]">
                            <PinIcon />
                            Sticky
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {post.categoryIds
                        .map((id) => categoryOf.get(id))
                        .filter((c) => !!c && c.status !== "Deleted")
                        .map((c) => categoryName(c!))
                        .join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {post.tagIds
                        .map((id) => tagOf.get(id))
                        .filter((t) => !!t && t.status !== "Deleted")
                        .map((t) => t!.name)
                        .join(", ") || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      <AuditUser row={post} />
                    </TableCell>
                    <TableCell>
                      <PostStatusBadge status={post.postStatus} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      {published && post.publishDate ? (
                        <>
                          <div>{stamp(post.publishDate)}</div>
                          {post.publishDate > new Date().toISOString() && (
                            <div className="text-muted-foreground">Scheduled</div>
                          )}
                        </>
                      ) : (
                        <>
                          <div>{stamp(post.modifiedAt)}</div>
                          <div className="text-muted-foreground">Last modified</div>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{visibilityLabel[post.visibility]}</TableCell>
                    <TableCell>
                      <StatusBadge status={post.status} />
                    </TableCell>
                    <TableCell>
                      <RowActions actions={actions(post)} />
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                  No post matches these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
