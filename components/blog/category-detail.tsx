"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, PencilIcon } from "lucide-react"

import {
  CATEGORIES_HREF,
  CATEGORY_RESOURCE,
  DetailRows,
  NotFound,
  POST_RESOURCE,
  POSTS_HREF,
  auditRows,
  backTo,
  withReturn,
} from "@/components/blog/blog-shared"
import { StatusBadge } from "@/components/institutes/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { surfaceHref, useSurfaces } from "@/lib/access"
import { categoryName, useAllCategories, useCategory } from "@/lib/blog-categories"
import { blogLanguages, postTitle, useAllPosts } from "@/lib/blog-posts"
import { useAccessibleInstitutes } from "@/lib/current-user"

// Legacy Category/Details, deleted ones included, with the posts filed
// under it.
export function CategoryDetail({ id, returnTo }: { id: number; returnTo?: string }) {
  const category = useCategory(id)
  const categories = useAllCategories()
  const posts = useAllPosts()
  const institute = useAccessibleInstitutes().find((i) => i.id === category?.instituteId)
  const surfaces = useSurfaces(CATEGORY_RESOURCE)
  const postSurfaces = useSurfaces(POST_RESOURCE)
  const canEdit = surfaces.some((s) => s !== "View")
  const listHref = backTo(returnTo, surfaceHref(CATEGORIES_HREF, surfaces[0] ?? "View"))

  if (!category || !institute) {
    return <NotFound title="Category not found" href={listHref} label="Back to categories" />
  }

  const parent = categories.find((c) => c.id === category.parentId)
  const children = categories.filter((c) => c.parentId === category.id && c.status !== "Deleted")
  const filed = posts.filter((p) => p.status !== "Deleted" && p.categoryIds.includes(category.id))
  const rows: [string, React.ReactNode][] = [
    ["Institute", institute.name],
    ...blogLanguages.flatMap(({ code, label }): [string, React.ReactNode][] => {
      const d = category.translations[code]
      return d
        ? [
            [`Name (${label})`, d.name],
            [`Slug (${label})`, d.slug],
            [`Browser title (${label})`, d.title],
          ]
        : []
    }),
    ["Parent", parent ? categoryName(parent) : "—"],
    ["Sub-categories", children.map(categoryName).join(", ") || "—"],
    [
      "Image",
      category.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={category.image} alt="" className="size-16 rounded object-cover" />
      ) : (
        "—"
      ),
    ],
    ...auditRows(category),
  ]

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={listHref}>
            <ArrowLeftIcon data-icon="inline-start" />
            Categories
          </Link>
        </Button>
        {category.status !== "Deleted" && canEdit && (
          <Button asChild variant="outline" size="sm">
            <Link href={withReturn(`${CATEGORIES_HREF}/${category.id}/edit`, listHref)}>
              <PencilIcon data-icon="inline-start" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      <Card className="max-w-3xl">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">{categoryName(category)}</CardTitle>
            <StatusBadge status={category.status} />
          </div>
          <CardDescription>Category details</CardDescription>
        </CardHeader>
        <CardContent>
          <DetailRows rows={rows} />
        </CardContent>
      </Card>

      <Card className="max-w-3xl">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Posts ({filed.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filed.length ? (
            <ul className="flex flex-col gap-2 text-sm">
              {filed.map((p) => (
                <li key={p.id}>
                  {postSurfaces.length ? (
                    <Link href={`${POSTS_HREF}/${p.id}`} className="underline-offset-4 hover:underline">
                      {postTitle(p)}
                    </Link>
                  ) : (
                    postTitle(p)
                  )}
                  <span className="text-muted-foreground"> · {p.postStatus}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No post is filed under this category.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
