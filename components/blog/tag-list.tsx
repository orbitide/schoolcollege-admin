"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArchiveRestoreIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { AuditDate, AuditUser, RowActions, TAG_RESOURCE, TAGS_HREF } from "@/components/blog/blog-shared"
import { StatusBadge } from "@/components/institutes/status-badge"
import { SurfaceTabs } from "@/components/surface-tabs"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
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
import { useAllPosts } from "@/lib/blog-posts"
import {
  deleteTag,
  deleteTagPermanently,
  isDuplicateTagName,
  renameTag,
  retrieveTag,
  toggleTagStatus,
  useAllTags,
  type BlogTag,
} from "@/lib/blog-tags"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { cn } from "@/lib/utils"

const titles: Record<AccessSurface, string> = {
  Admin: "Manage Tags (Admin)",
  Manage: "Manage Tags",
  View: "View Tags",
}

// Legacy Tags/Manage: each institute's tags with their post counts, most
// used first. Tags are made on the post form; here they are renamed,
// (in)activated and deleted.
export function TagList({ surface }: { surface: AccessSurface }) {
  const can = capabilitiesFor(surface, { resource: TAG_RESOURCE, softDelete: true })
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const tags = useAllTags()
  const posts = useAllPosts()
  const [editing, setEditing] = React.useState<BlogTag | null>(null)
  const canPick = institutes.length > 1

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const withDeleted = can.restore && param("deleted") === "1"
  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()

  const instituteOf = new Map(institutes.map((i) => [i.id, i]))
  const postCount = new Map<number, number>()
  for (const post of posts) {
    if (post.status === "Deleted") continue
    for (const id of post.tagIds) postCount.set(id, (postCount.get(id) ?? 0) + 1)
  }
  const rows = tags
    .filter(
      (t) =>
        instituteOf.has(t.instituteId) &&
        (!institute || t.instituteId === institute.id) &&
        (withDeleted || t.status !== "Deleted") &&
        (!needle || t.name.toLowerCase().includes(needle))
    )
    .sort(
      (a, b) =>
        Number(a.status === "Deleted") - Number(b.status === "Deleted") ||
        (postCount.get(b.id) ?? 0) - (postCount.get(a.id) ?? 0) ||
        a.name.localeCompare(b.name)
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

  const showInstitute = !institute

  function actions(tag: BlogTag) {
    const deleted = tag.status === "Deleted"
    return [
      !deleted && can.edit && { label: "Edit", icon: <PencilIcon />, onSelect: () => setEditing(tag) },
      !deleted &&
        can.status && {
          label: tag.status === "Active" ? "Inactive" : "Active",
          icon: tag.status === "Active" ? <CircleMinusIcon /> : <CircleCheckIcon />,
          onSelect: () => {
            toggleTagStatus(tag.id, user.name)
            toast.success(tag.status === "Active" ? "In-activated successfully" : "Activated successfully")
          },
        },
      deleted &&
        can.restore && {
          label: "Retrieve",
          icon: <ArchiveRestoreIcon />,
          onSelect: () => retrieveTag(tag.id, user.name),
          confirm: { title: `Retrieve "${tag.name}"?`, description: "It comes back as active.", done: "Tag retrieved successfully" },
        },
      can.delete && {
        label: deleted ? "Permanent Delete" : "Delete",
        icon: <Trash2Icon />,
        destructive: true,
        separated: true,
        onSelect: () => (deleted ? deleteTagPermanently(tag.id) : deleteTag(tag.id, user.name)),
        confirm: deleted
          ? { title: `Permanently delete "${tag.name}"?`, description: "It is removed for good and taken off its posts. This cannot be undone.", done: "Tag deleted successfully" }
          : { title: `Delete "${tag.name}"?`, description: "Its posts stop showing it. An admin can retrieve it later from “With Deleted”.", done: "Tag deleted successfully" },
      },
    ]
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{titles[surface]}</CardTitle>
            <CardDescription>Tags are added by typing them on a post.</CardDescription>
          </div>
          <SurfaceTabs resource={TAG_RESOURCE} baseUrl={TAGS_HREF} current={surface} />
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
                placeholder="Search name"
                aria-label="Search tags"
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
              <TableHead>Name</TableHead>
              <TableHead>Total Posts</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((tag, index) => {
                const owner = instituteOf.get(tag.instituteId)
                return (
                  <TableRow key={tag.id} className={cn(tag.status === "Deleted" && "text-muted-foreground")}>
                    <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                    {showInstitute && <TableCell>{owner?.shortName || owner?.name || "—"}</TableCell>}
                    <TableCell className="font-medium">{tag.name}</TableCell>
                    <TableCell className="tabular-nums">{postCount.get(tag.id) ?? 0}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      <AuditUser row={tag} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      <AuditDate row={tag} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={tag.status} />
                    </TableCell>
                    <TableCell>
                      {(can.edit || can.status || can.delete) && <RowActions actions={actions(tag)} />}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7 + Number(showInstitute)} className="h-24 text-center text-muted-foreground">
                  No tag matches these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          {editing && <TagForm tag={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TagForm({ tag, onDone }: { tag: BlogTag; onDone: () => void }) {
  const user = useCurrentUser()
  const id = React.useId()
  const [name, setName] = React.useState(tag.name)
  const [error, setError] = React.useState<string>()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) setError("Insert tag name.")
    else if (isDuplicateTagName(tag.instituteId, name, tag.id)) setError("This institute already has this tag.")
    else {
      renameTag(tag.id, name, user.name)
      toast.success("Tag updated successfully")
      onDone()
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Edit tag</DialogTitle>
        <DialogDescription>Renaming it changes it on every post that has it.</DialogDescription>
      </DialogHeader>
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor={id}>Name</FieldLabel>
        <Input
          id={id}
          autoFocus
          value={name}
          aria-invalid={!!error}
          onChange={(event) => {
            setName(event.target.value)
            setError(undefined)
          }}
        />
        <FieldError>{error}</FieldError>
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">Update</Button>
      </DialogFooter>
    </form>
  )
}
