"use client"

import * as React from "react"

import { removeTagFromPosts } from "@/lib/blog-posts"
import { logChanges } from "@/lib/common-log"

// Legacy NetCoreCMS NccTag (Blog › Tags), owned by one institute. Tags are
// made by typing them on a post (legacy tagsinput); the Tags page renames,
// (in)activates and deletes them. Deleting marks it "Deleted" (Admin can
// retrieve it); a permanent delete removes it from its posts. In-memory like
// the rest of admin; replace with API calls once the backend endpoints exist.

export type BlogTag = {
  id: number
  instituteId: number
  name: string
  status: "Active" | "Inactive" | "Deleted"
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

const now = () => new Date().toISOString()
const seedUser = "Super Admin"
const seedStamp = "2026-01-10T09:30:00.000Z"

const seed: BlogTag[] = [
  [1, 1, "result"],
  [2, 1, "ssc"],
  [3, 1, "sports"],
  [4, 5, "admission"],
].map(([id, instituteId, name]) => ({
  id: id as number,
  instituteId: instituteId as number,
  name: name as string,
  status: "Active" as const,
  createdBy: seedUser,
  createdAt: seedStamp,
  modifiedBy: seedUser,
  modifiedAt: seedStamp,
}))

let tags = seed
const listeners = new Set<() => void>()

function emit(next: BlogTag[]) {
  logChanges("NccTag", tags, next)
  tags = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Every tag of every institute, deleted ones included.
export function useAllTags() {
  return React.useSyncExternalStore(
    subscribe,
    () => tags,
    () => seed
  )
}

export function useTag(id: number) {
  return useAllTags().find((t) => t.id === id)
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export function isDuplicateTagName(instituteId: number, name: string, exceptId?: number) {
  return tags.some((t) => t.id !== exceptId && t.instituteId === instituteId && same(t.name, name))
}

// The ids of the named tags, making the ones the institute doesn't have yet
// (legacy: unknown tags are created when the post is saved). A deleted tag of
// that name comes back.
export function ensureTags(instituteId: number, names: string[], user: string) {
  const stamp = now()
  let next = tags
  const ids: number[] = []
  for (const raw of names) {
    const name = raw.trim()
    if (!name) continue
    const existing = next.find((t) => t.instituteId === instituteId && same(t.name, name))
    if (existing) {
      if (existing.status === "Deleted") {
        next = next.map((t) =>
          t.id === existing.id ? { ...t, status: "Active", modifiedBy: user, modifiedAt: stamp } : t
        )
      }
      if (!ids.includes(existing.id)) ids.push(existing.id)
      continue
    }
    const tag: BlogTag = {
      id: Math.max(0, ...next.map((t) => t.id)) + 1,
      instituteId,
      name,
      status: "Active",
      createdBy: user,
      createdAt: stamp,
      modifiedBy: user,
      modifiedAt: stamp,
    }
    next = [...next, tag]
    ids.push(tag.id)
  }
  if (next !== tags) emit(next)
  return ids
}

function patch(id: number, changes: Partial<BlogTag>, user: string) {
  emit(tags.map((t) => (t.id === id ? { ...t, ...changes, modifiedBy: user, modifiedAt: now() } : t)))
}

export function renameTag(id: number, name: string, user: string) {
  const tag = tags.find((t) => t.id === id)
  if (!tag || tag.status === "Deleted") return
  patch(id, { name: name.trim() }, user)
}

export function toggleTagStatus(id: number, user: string) {
  const tag = tags.find((t) => t.id === id)
  if (!tag || tag.status === "Deleted") return
  patch(id, { status: tag.status === "Active" ? "Inactive" : "Active" }, user)
}

export function deleteTag(id: number, user: string) {
  const tag = tags.find((t) => t.id === id)
  if (!tag || tag.status === "Deleted") return
  patch(id, { status: "Deleted" }, user)
}

export function retrieveTag(id: number, user: string) {
  const tag = tags.find((t) => t.id === id)
  if (!tag || tag.status !== "Deleted") return
  patch(id, { status: "Active" }, user)
}

export function deleteTagPermanently(id: number) {
  emit(tags.filter((t) => t.id !== id))
  removeTagFromPosts(id)
}

export function removeInstituteTags(instituteId: number) {
  emit(tags.filter((t) => t.instituteId !== instituteId))
}
