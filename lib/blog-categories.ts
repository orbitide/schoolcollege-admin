"use client"

import * as React from "react"

import { removeCategoryFromPosts, type BlogLanguage } from "@/lib/blog-posts"
import { logChanges } from "@/lib/common-log"

// Legacy NetCoreCMS NccCategory + NccCategoryDetails (Blog › Category), owned
// by one institute. Categories nest up to four levels (the depth of the
// legacy category tree). One can't be deleted while it has sub-categories.
// Deleting marks it "Deleted" (Admin can retrieve it); a permanent delete
// removes it and takes it off its posts. In-memory like the rest of admin;
// replace with API calls once the backend endpoints exist.

export const MAX_CATEGORY_DEPTH = 4

export type BlogCategoryTranslation = {
  name: string
  slug: string
  // Legacy "Browser Title".
  title: string
}

export type BlogCategory = {
  id: number
  instituteId: number
  parentId: number | null
  image: string
  translations: Partial<Record<BlogLanguage, BlogCategoryTranslation>>
  status: "Active" | "Inactive" | "Deleted"
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export type BlogCategoryInput = Pick<BlogCategory, "instituteId" | "parentId" | "image" | "translations">

const now = () => new Date().toISOString()
const seedUser = "Super Admin"
const seedStamp = "2026-01-10T09:30:00.000Z"

function seedCategory(
  id: number,
  instituteId: number,
  parentId: number | null,
  en: string,
  bn?: string
): BlogCategory {
  const details = (name: string, slug: string) => ({ name, slug, title: name })
  return {
    id,
    instituteId,
    parentId,
    image: "",
    translations: {
      en: details(en, en.toLowerCase().replace(/\s+/g, "-")),
      ...(bn && { bn: details(bn, bn.replace(/\s+/g, "-")) }),
    },
    status: "Active",
    createdBy: seedUser,
    createdAt: seedStamp,
    modifiedBy: seedUser,
    modifiedAt: seedStamp,
  }
}

const seed: BlogCategory[] = [
  seedCategory(1, 1, null, "News", "সংবাদ"),
  seedCategory(2, 1, 1, "Events", "অনুষ্ঠান"),
  seedCategory(3, 1, null, "Academic", "একাডেমিক"),
  seedCategory(4, 5, null, "Admission", "ভর্তি"),
]

let categories = seed
const listeners = new Set<() => void>()

function emit(next: BlogCategory[]) {
  logChanges("NccCategory", categories, next)
  categories = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Every category of every institute, deleted ones included.
export function useAllCategories() {
  return React.useSyncExternalStore(
    subscribe,
    () => categories,
    () => seed
  )
}

export function useCategory(id: number) {
  return useAllCategories().find((c) => c.id === id)
}

export function categoryName(category: Pick<BlogCategory, "translations">) {
  return category.translations.en?.name ?? Object.values(category.translations)[0]?.name ?? "—"
}

// 1 for a top-level category.
export function categoryDepth(all: readonly BlogCategory[], category: BlogCategory) {
  let depth = 1
  let parentId = category.parentId
  const byId = new Map(all.map((c) => [c.id, c]))
  while (parentId != null && depth <= MAX_CATEGORY_DEPTH) {
    depth++
    parentId = byId.get(parentId)?.parentId ?? null
  }
  return depth
}

// The ids of the category and everything under it.
export function categorySubtree(all: readonly BlogCategory[], id: number) {
  const ids = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const c of all) {
      if (c.parentId != null && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id)
        grew = true
      }
    }
  }
  return ids
}

// Levels the subtree spans (1 for a category without children).
function subtreeHeight(all: readonly BlogCategory[], id: number): number {
  const children = all.filter((c) => c.parentId === id && c.status !== "Deleted")
  return 1 + Math.max(0, ...children.map((c) => subtreeHeight(all, c.id)))
}

// Categories the given one may sit under: same institute, not deleted, not
// itself or below it, and deep enough room for its subtree.
export function parentOptions(
  all: readonly BlogCategory[],
  instituteId: number,
  categoryId?: number
) {
  const blocked = categoryId == null ? new Set<number>() : categorySubtree(all, categoryId)
  const height = categoryId == null ? 1 : subtreeHeight(all, categoryId)
  return all.filter(
    (c) =>
      c.instituteId === instituteId &&
      c.status !== "Deleted" &&
      !blocked.has(c.id) &&
      categoryDepth(all, c) + height <= MAX_CATEGORY_DEPTH
  )
}

// The institute's categories as a tree, depth first, each with its level.
export function categoryTree(all: readonly BlogCategory[], instituteId: number, withDeleted = false) {
  const mine = all.filter(
    (c) => c.instituteId === instituteId && (withDeleted || c.status !== "Deleted")
  )
  const ids = new Set(mine.map((c) => c.id))
  const out: { category: BlogCategory; level: number }[] = []
  const walk = (parentId: number | null, level: number) => {
    mine
      .filter((c) =>
        parentId == null ? c.parentId == null || !ids.has(c.parentId) : c.parentId === parentId
      )
      .sort((a, b) => categoryName(a).localeCompare(categoryName(b)))
      .forEach((category) => {
        out.push({ category, level })
        walk(category.id, level + 1)
      })
  }
  walk(null, 0)
  return out
}

export function isDuplicateCategorySlug(
  instituteId: number,
  language: BlogLanguage,
  slug: string,
  exceptId?: number
) {
  const needle = slug.trim().toLowerCase()
  return categories.some(
    (c) =>
      c.id !== exceptId &&
      c.instituteId === instituteId &&
      c.translations[language]?.slug.toLowerCase() === needle
  )
}

// Legacy: can't delete a category that still has sub-categories.
export function hasChildCategories(id: number) {
  return categories.some((c) => c.parentId === id && c.status !== "Deleted")
}

function clean(input: BlogCategoryInput): BlogCategoryInput {
  const translations: BlogCategoryInput["translations"] = {}
  for (const [code, details] of Object.entries(input.translations) as [BlogLanguage, BlogCategoryTranslation][]) {
    translations[code] = {
      name: details.name.trim(),
      slug: details.slug.trim(),
      title: details.title.trim() || details.name.trim(),
    }
  }
  return { ...input, translations }
}

export function addCategory(input: BlogCategoryInput, user: string) {
  const stamp = now()
  const category: BlogCategory = {
    ...clean(input),
    id: Math.max(0, ...categories.map((c) => c.id)) + 1,
    status: "Active",
    createdBy: user,
    createdAt: stamp,
    modifiedBy: user,
    modifiedAt: stamp,
  }
  emit([...categories, category])
  return category
}

function patch(id: number, changes: Partial<BlogCategory>, user: string) {
  emit(
    categories.map((c) =>
      c.id === id ? { ...c, ...changes, modifiedBy: user, modifiedAt: now() } : c
    )
  )
}

export function updateCategory(id: number, input: BlogCategoryInput, user: string) {
  const category = categories.find((c) => c.id === id)
  if (!category || category.status === "Deleted") return
  patch(id, clean(input), user)
}

export function toggleCategoryStatus(id: number, user: string) {
  const category = categories.find((c) => c.id === id)
  if (!category || category.status === "Deleted") return
  patch(id, { status: category.status === "Active" ? "Inactive" : "Active" }, user)
}

// False when it still has sub-categories.
export function deleteCategory(id: number, user: string) {
  const category = categories.find((c) => c.id === id)
  if (!category || category.status === "Deleted") return true
  if (hasChildCategories(id)) return false
  patch(id, { status: "Deleted" }, user)
  return true
}

// Its parent may be gone meanwhile; it then comes back at the top level.
export function retrieveCategory(id: number, user: string) {
  const category = categories.find((c) => c.id === id)
  if (!category || category.status !== "Deleted") return
  const parent = categories.find((c) => c.id === category.parentId)
  patch(
    id,
    { status: "Active", ...(parent?.status === "Deleted" && { parentId: null }) },
    user
  )
}

export function deleteCategoryPermanently(id: number) {
  if (hasChildCategories(id)) return false
  // Deleted sub-categories come back at the top level if retrieved.
  emit(
    categories
      .filter((c) => c.id !== id)
      .map((c) => (c.parentId === id ? { ...c, parentId: null } : c))
  )
  removeCategoryFromPosts(id)
  return true
}

export function removeInstituteCategories(instituteId: number) {
  emit(categories.filter((c) => c.instituteId !== instituteId))
}
