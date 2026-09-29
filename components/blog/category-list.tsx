"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArchiveRestoreIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  EyeIcon,
  ImageIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  AuditDate,
  AuditUser,
  CATEGORIES_HREF,
  CATEGORY_RESOURCE,
  RowActions,
  withReturn,
} from "@/components/blog/blog-shared"
import { StatusBadge } from "@/components/institutes/status-badge"
import { SurfaceTabs } from "@/components/surface-tabs"
import { FilterField } from "@/components/term-exams/term-exam-fields"
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
import {
  categoryName,
  categoryTree,
  deleteCategory,
  deleteCategoryPermanently,
  retrieveCategory,
  toggleCategoryStatus,
  useAllCategories,
  type BlogCategory,
} from "@/lib/blog-categories"
import { useAllPosts } from "@/lib/blog-posts"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { cn } from "@/lib/utils"

const titles: Record<AccessSurface, string> = {
  Admin: "Manage Category (Admin)",
  Manage: "Manage Category",
  View: "View Category",
}

// Legacy Category/Manage: each institute's categories as a tree, with their
// post counts. A category with sub-categories can't be deleted.
export function CategoryList({ surface }: { surface: AccessSurface }) {
  const can = capabilitiesFor(surface, { resource: CATEGORY_RESOURCE, softDelete: true })
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const categories = useAllCategories()
  const posts = useAllPosts()
  const canPick = institutes.length > 1

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const withDeleted = can.restore && param("deleted") === "1"
  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()

  const categoryOf = new Map(categories.map((c) => [c.id, c]))
  const rows = (institute ? [institute] : institutes).flatMap((i) =>
    categoryTree(categories, i.id, withDeleted)
      .filter(({ category }) =>
        !needle ||
        Object.values(category.translations).some((t) => t?.name.toLowerCase().includes(needle))
      )
      .map((row) => ({ ...row, institute: i }))
  )
  const postCount = (id: number) =>
    posts.filter((p) => p.status !== "Deleted" && p.categoryIds.includes(id)).length

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
    `${CATEGORIES_HREF}/new${institute ? `?institute=${institute.id}` : ""}`,
    returnTo
  )
  const showInstitute = !institute

  function actions(category: BlogCategory) {
    const deleted = category.status === "Deleted"
    const name = categoryName(category)
    const blocked = () => {
      toast.error("Delete its sub-categories first.")
      return false
    }
    return [
      { label: "Details", icon: <EyeIcon />, href: withReturn(`${CATEGORIES_HREF}/${category.id}`, returnTo) },
      !deleted &&
        can.edit && { label: "Edit", icon: <PencilIcon />, href: withReturn(`${CATEGORIES_HREF}/${category.id}/edit`, returnTo) },
      !deleted &&
        can.status && {
          label: category.status === "Active" ? "Inactive" : "Active",
          icon: category.status === "Active" ? <CircleMinusIcon /> : <CircleCheckIcon />,
          onSelect: () => {
            toggleCategoryStatus(category.id, user.name)
            toast.success(category.status === "Active" ? "In-activated successfully" : "Activated successfully")
          },
        },
      deleted &&
        can.restore && {
          label: "Retrieve",
          icon: <ArchiveRestoreIcon />,
          onSelect: () => retrieveCategory(category.id, user.name),
          confirm: { title: `Retrieve "${name}"?`, description: "It comes back as active.", done: "Category retrieved successfully" },
        },
      can.delete && {
        label: deleted ? "Permanent Delete" : "Delete",
        icon: <Trash2Icon />,
        destructive: true,
        separated: true,
        onSelect: () =>
          (deleted ? deleteCategoryPermanently(category.id) : deleteCategory(category.id, user.name)) || blocked(),
        confirm: deleted
          ? { title: `Permanently delete "${name}"?`, description: "It is removed for good and taken off its posts. This cannot be undone.", done: "Category deleted successfully" }
          : { title: `Delete "${name}"?`, description: "Its posts stay. An admin can retrieve it later from “With Deleted”.", done: "Category deleted successfully" },
      },
    ]
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{titles[surface]}</CardTitle>
            <CardDescription>Blog categories, up to four levels deep.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SurfaceTabs resource={CATEGORY_RESOURCE} baseUrl={CATEGORIES_HREF} current={surface} />
            {can.create && institutes.length > 0 && (
              <Button asChild size="sm">
                <Link href={newHref}>
                  <PlusIcon data-icon="inline-start" />
                  Add Category
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
                aria-label="Search categories"
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
              <TableHead>Image</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Total Post</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map(({ category, level, institute: owner }, index) => {
                const parent = category.parentId == null ? undefined : categoryOf.get(category.parentId)
                return (
                  <TableRow key={category.id} className={cn(category.status === "Deleted" && "text-muted-foreground")}>
                    <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                    {showInstitute && <TableCell>{owner.shortName || owner.name}</TableCell>}
                    <TableCell>
                      <Link
                        href={withReturn(`${CATEGORIES_HREF}/${category.id}`, returnTo)}
                        className="font-medium underline-offset-4 hover:underline"
                        style={{ paddingLeft: `${level * 1.25}rem` }}
                      >
                        {level > 0 && <span className="text-muted-foreground">└ </span>}
                        {categoryName(category)}
                      </Link>
                      {category.translations.bn && (
                        <div className="text-xs text-muted-foreground" style={{ paddingLeft: `${level * 1.25}rem` }}>
                          {category.translations.bn.name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {category.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={category.image} alt="" className="size-8 rounded object-cover" />
                      ) : (
                        <ImageIcon className="size-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>{parent ? categoryName(parent) : "—"}</TableCell>
                    <TableCell className="tabular-nums">{postCount(category.id)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      <AuditUser row={category} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      <AuditDate row={category} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={category.status} />
                    </TableCell>
                    <TableCell>
                      <RowActions actions={actions(category)} />
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9 + Number(showInstitute)} className="h-24 text-center text-muted-foreground">
                  No category matches these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
