"use client"

import * as React from "react"

import { removePostComments } from "@/lib/blog-comments"
import { logChanges } from "@/lib/common-log"

// Legacy NetCoreCMS NccPost + NccPostDetails (Blog › Manage post / My Post),
// owned by one institute as in ezducms. A post has one set of details per
// language: English is the default and required, Bangla is optional. A slug
// is unique within its institute and language. Deleting marks it "Deleted"
// (Admin can retrieve it); a permanent delete removes it and its comments.
// In-memory like the rest of admin; replace with API calls once the backend
// endpoints exist.

export const blogLanguages = [
  { code: "en", label: "English" },
  { code: "bn", label: "বাংলা" },
] as const
export type BlogLanguage = (typeof blogLanguages)[number]["code"]
export const DEFAULT_LANGUAGE: BlogLanguage = "en"

export const postStatuses = ["Draft", "Reviewed", "Published", "UnPublished", "Archived"] as const
export type PostStatus = (typeof postStatuses)[number]

export const postVisibilities = ["Public", "Private", "PasswordProtected"] as const
export type PostVisibility = (typeof postVisibilities)[number]

export const visibilityLabel: Record<PostVisibility, string> = {
  Public: "Public",
  Private: "Private",
  PasswordProtected: "Password protected",
}

export type BlogPostTranslation = {
  title: string
  slug: string
  // HTML from the rich-text editor; sanitise before rendering it.
  content: string
  metaDescription: string
  metaKeyword: string
}

export type BlogPost = {
  id: number
  instituteId: number
  translations: Partial<Record<BlogLanguage, BlogPostTranslation>>
  postStatus: PostStatus
  visibility: PostVisibility
  // ISO; legacy Schedule Date. Set on first publish if empty, and never
  // rewritten by publishing again (ezducms).
  publishDate: string
  parentId: number | null
  isFeatured: boolean
  isSticky: boolean
  allowComment: boolean
  thumbImage: string
  featuredImage: string
  categoryIds: number[]
  tagIds: number[]
  // Legacy never set Author, so every post read "Anonymous"; we keep who
  // wrote it (for My Post) and their name as it was then.
  authorId: number | null
  authorName: string
  status: "Active" | "Deleted"
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export type BlogPostInput = Omit<
  BlogPost,
  "id" | "authorId" | "authorName" | "status" | "createdBy" | "createdAt" | "modifiedBy" | "modifiedAt"
>

const now = () => new Date().toISOString()
const seedUser = "Super Admin"

type SeedPost = Pick<BlogPost, "id" | "instituteId" | "translations" | "postStatus" | "publishDate"> &
  Partial<BlogPost>

function seedPost(post: SeedPost): BlogPost {
  const stamp = post.createdAt ?? post.publishDate ?? "2026-01-10T09:30:00.000Z"
  return {
    visibility: "Public",
    parentId: null,
    isFeatured: false,
    isSticky: false,
    allowComment: true,
    thumbImage: "",
    featuredImage: "",
    categoryIds: [],
    tagIds: [],
    authorId: 1,
    authorName: seedUser,
    status: "Active",
    createdBy: seedUser,
    createdAt: stamp,
    modifiedBy: seedUser,
    modifiedAt: stamp,
    ...post,
  }
}

const seed: BlogPost[] = [
  seedPost({
    id: 1,
    instituteId: 1,
    postStatus: "Published",
    publishDate: "2026-05-12T04:00:00.000Z",
    isFeatured: true,
    categoryIds: [1, 3],
    tagIds: [1, 2],
    translations: {
      en: {
        title: "SSC 2026 results: 98% pass rate",
        slug: "ssc-2026-results-98-pass-rate",
        content:
          "<p>We are proud to share that <strong>98% of our students</strong> passed the SSC examination this year, with 64 students earning GPA 5.</p><h2>Collecting mark sheets</h2><p>Mark sheets can be collected from the office from <em>Sunday</em>, 9 am to 1 pm.</p>",
        metaDescription: "98% of our students passed the SSC examination this year, with 64 students earning GPA 5.",
        metaKeyword: "ssc, result, 2026",
      },
      bn: {
        title: "এসএসসি ২০২৬ ফলাফল: পাসের হার ৯৮%",
        slug: "এসএসসি-২০২৬-ফলাফল-পাসের-হার-৯৮",
        content: "<p>এ বছর আমাদের <strong>৯৮% শিক্ষার্থী</strong> এসএসসি পরীক্ষায় উত্তীর্ণ হয়েছে।</p>",
        metaDescription: "এ বছর আমাদের ৯৮% শিক্ষার্থী এসএসসি পরীক্ষায় উত্তীর্ণ হয়েছে।",
        metaKeyword: "এসএসসি, ফলাফল",
      },
    },
  }),
  seedPost({
    id: 2,
    instituteId: 1,
    postStatus: "Published",
    publishDate: "2026-08-01T03:00:00.000Z",
    isSticky: true,
    categoryIds: [2],
    tagIds: [3],
    translations: {
      en: {
        title: "Annual sports day on 12 November",
        slug: "annual-sports-day",
        content:
          "<p>The annual sports day will be held on the school field on <strong>12–13 November</strong>.</p><ul><li>Track events</li><li>Football final</li><li>Prize giving</li></ul>",
        metaDescription: "The annual sports day will be held on the school field on 12–13 November.",
        metaKeyword: "sports, event",
      },
    },
  }),
  seedPost({
    id: 3,
    instituteId: 1,
    postStatus: "Draft",
    publishDate: "",
    authorId: 7,
    authorName: "Abdul Karim",
    createdBy: "Abdul Karim",
    modifiedBy: "Abdul Karim",
    createdAt: "2026-09-20T07:00:00.000Z",
    categoryIds: [3],
    translations: {
      en: {
        title: "Tips for preparing for the half-yearly exam",
        slug: "half-yearly-exam-tips",
        content: "<p>Start with the chapters you find hardest, and practise past papers under time.</p>",
        metaDescription: "Start with the chapters you find hardest, and practise past papers under time.",
        metaKeyword: "exam, study",
      },
    },
  }),
  seedPost({
    id: 4,
    instituteId: 5,
    postStatus: "Published",
    publishDate: "2026-09-01T03:00:00.000Z",
    isFeatured: true,
    categoryIds: [4],
    tagIds: [4],
    translations: {
      en: {
        title: "Admission open for 2027",
        slug: "admission-open-2027",
        content: "<p>Admission forms for the 2027 session are available at the office and online.</p>",
        metaDescription: "Admission forms for the 2027 session are available at the office and online.",
        metaKeyword: "admission",
      },
    },
  }),
]

let posts = seed
const listeners = new Set<() => void>()

function emit(next: BlogPost[]) {
  logChanges("NccPost", posts, next)
  posts = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Every post of every institute, deleted ones included.
export function useAllPosts() {
  return React.useSyncExternalStore(
    subscribe,
    () => posts,
    () => seed
  )
}

export function usePost(id: number) {
  return useAllPosts().find((p) => p.id === id)
}

// The default language's title, else the first one written.
export function postTitle(post: Pick<BlogPost, "translations">, language?: BlogLanguage) {
  const details =
    (language && post.translations[language]) ??
    post.translations[DEFAULT_LANGUAGE] ??
    Object.values(post.translations)[0]
  return details?.title || "(untitled)"
}

// Legacy: a slug is unique per language (NccPostDetails); ezducms narrows
// that to one institute. Deleted posts keep theirs, so a retrieve can't clash.
export function isDuplicatePostSlug(
  instituteId: number,
  language: BlogLanguage,
  slug: string,
  exceptId?: number
) {
  const needle = slug.trim().toLowerCase()
  return posts.some(
    (p) =>
      p.id !== exceptId &&
      p.instituteId === instituteId &&
      p.translations[language]?.slug.toLowerCase() === needle
  )
}

// Legacy: the meta description defaults to the content's text, 160
// characters of it.
export function plainText(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function clean(input: BlogPostInput): BlogPostInput {
  const translations: BlogPostInput["translations"] = {}
  for (const { code } of blogLanguages) {
    const details = input.translations[code]
    if (!details) continue
    translations[code] = {
      title: details.title.trim(),
      slug: details.slug.trim(),
      content: details.content,
      metaDescription: details.metaDescription.trim() || plainText(details.content).slice(0, 160),
      metaKeyword: details.metaKeyword.trim(),
    }
  }
  const published = input.postStatus === "Published"
  return {
    ...input,
    translations,
    publishDate: input.publishDate || (published ? now() : ""),
  }
}

export function addPost(input: BlogPostInput, user: { id: number; name: string }) {
  const stamp = now()
  const post: BlogPost = {
    ...clean(input),
    id: Math.max(0, ...posts.map((p) => p.id)) + 1,
    authorId: user.id,
    authorName: user.name,
    status: "Active",
    createdBy: user.name,
    createdAt: stamp,
    modifiedBy: user.name,
    modifiedAt: stamp,
  }
  emit([...posts, post])
  return post
}

function patch(id: number, changes: Partial<BlogPost>, user: string) {
  emit(posts.map((p) => (p.id === id ? { ...p, ...changes, modifiedBy: user, modifiedAt: now() } : p)))
}

export function updatePost(id: number, input: BlogPostInput, user: string) {
  const post = posts.find((p) => p.id === id)
  if (!post || post.status === "Deleted") return
  patch(id, clean(input), user)
}

// Legacy Post/PublishPost: Published ⇄ Draft. The first publish date stays.
export function togglePublishPost(id: number, user: string) {
  const post = posts.find((p) => p.id === id)
  if (!post || post.status === "Deleted") return
  const published = post.postStatus === "Published"
  patch(
    id,
    published
      ? { postStatus: "Draft" }
      : { postStatus: "Published", publishDate: post.publishDate || now() },
    user
  )
}

export function deletePost(id: number, user: string) {
  const post = posts.find((p) => p.id === id)
  if (!post || post.status === "Deleted") return
  patch(id, { status: "Deleted" }, user)
}

export function retrievePost(id: number, user: string) {
  const post = posts.find((p) => p.id === id)
  if (!post || post.status !== "Deleted") return
  patch(id, { status: "Active" }, user)
}

// Its comments go too, and child posts lose their parent.
export function deletePostPermanently(id: number) {
  emit(
    posts
      .filter((p) => p.id !== id)
      .map((p) => (p.parentId === id ? { ...p, parentId: null } : p))
  )
  removePostComments(id)
}

// A category or tag deleted for good is taken off its posts.
export function removeCategoryFromPosts(categoryId: number) {
  if (!posts.some((p) => p.categoryIds.includes(categoryId))) return
  emit(
    posts.map((p) =>
      p.categoryIds.includes(categoryId)
        ? { ...p, categoryIds: p.categoryIds.filter((c) => c !== categoryId) }
        : p
    )
  )
}

export function removeTagFromPosts(tagId: number) {
  if (!posts.some((p) => p.tagIds.includes(tagId))) return
  emit(
    posts.map((p) =>
      p.tagIds.includes(tagId) ? { ...p, tagIds: p.tagIds.filter((t) => t !== tagId) } : p
    )
  )
}

export function removeInstitutePosts(instituteId: number) {
  emit(posts.filter((p) => p.instituteId !== instituteId))
}

// ISO ⇄ the value of an <input type="datetime-local"> (local time).
export function toLocalInput(iso: string) {
  if (!iso) return ""
  const date = new Date(iso)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : ""
}
