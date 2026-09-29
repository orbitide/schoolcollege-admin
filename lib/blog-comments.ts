"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"

// Legacy NetCoreCMS NccComment (Blog › Manage Comments / My Comments): a
// comment on a post. It starts Pending and shows on the post only once a
// moderator approves it. Deleting marks it "Deleted" (Admin can retrieve
// it); a permanent delete removes it. In-memory like the rest of admin;
// replace with API calls once the backend endpoints exist.

export const commentStatuses = ["Pending", "Approved", "Rejected", "Spam"] as const
export type CommentStatus = (typeof commentStatuses)[number]

export type BlogComment = {
  id: number
  instituteId: number
  postId: number
  content: string
  authorName: string
  email: string
  website: string
  // The admin user who wrote it (legacy Author), for My Comments; null for
  // a visitor of the public site.
  authorId: number | null
  commentStatus: CommentStatus
  status: "Active" | "Deleted"
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export type BlogCommentInput = Pick<
  BlogComment,
  "instituteId" | "postId" | "content" | "authorName" | "email" | "website"
>

const now = () => new Date().toISOString()

function seedComment(
  id: number,
  postId: number,
  instituteId: number,
  authorName: string,
  content: string,
  commentStatus: CommentStatus,
  createdAt: string
): BlogComment {
  return {
    id,
    instituteId,
    postId,
    content,
    authorName,
    email: "",
    website: "",
    authorId: null,
    commentStatus,
    status: "Active",
    createdBy: authorName,
    createdAt,
    modifiedBy: authorName,
    modifiedAt: createdAt,
  }
}

const seed: BlogComment[] = [
  seedComment(1, 1, 1, "Shahana Parvin", "Congratulations to all the students and teachers!", "Approved", "2026-05-13T08:15:00.000Z"),
  seedComment(2, 1, 1, "Mizanur Rahman", "When will the mark sheets be handed out?", "Pending", "2026-05-14T10:40:00.000Z"),
  seedComment(3, 2, 1, "Visitor", "Buy cheap followers at example.com", "Spam", "2026-08-02T04:00:00.000Z"),
  seedComment(4, 5, 5, "Rokeya Begum", "Is admission open for class six as well?", "Pending", "2026-09-02T06:30:00.000Z"),
]

let comments = seed
const listeners = new Set<() => void>()

function emit(next: BlogComment[]) {
  logChanges("NccComment", comments, next)
  comments = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Every comment of every institute, deleted ones included.
export function useAllComments() {
  return React.useSyncExternalStore(
    subscribe,
    () => comments,
    () => seed
  )
}

export function useComment(id: number) {
  return useAllComments().find((c) => c.id === id)
}

function clean(input: BlogCommentInput): BlogCommentInput {
  return {
    ...input,
    content: input.content.trim(),
    authorName: input.authorName.trim(),
    email: input.email.trim(),
    website: input.website.trim(),
  }
}

// A new comment waits for a moderator (legacy default CommentStatus.Pending).
export function addComment(input: BlogCommentInput, user: { id: number; name: string }) {
  const stamp = now()
  const comment: BlogComment = {
    ...clean(input),
    id: Math.max(0, ...comments.map((c) => c.id)) + 1,
    authorId: user.id,
    commentStatus: "Pending",
    status: "Active",
    createdBy: user.name,
    createdAt: stamp,
    modifiedBy: user.name,
    modifiedAt: stamp,
  }
  emit([...comments, comment])
  return comment
}

function patch(id: number, changes: Partial<BlogComment>, user: string) {
  emit(
    comments.map((c) =>
      c.id === id ? { ...c, ...changes, modifiedBy: user, modifiedAt: now() } : c
    )
  )
}

export function updateComment(
  id: number,
  input: Omit<BlogCommentInput, "instituteId" | "postId">,
  commentStatus: CommentStatus,
  user: string
) {
  const comment = comments.find((c) => c.id === id)
  if (!comment || comment.status === "Deleted") return
  patch(id, { ...clean({ ...comment, ...input }), commentStatus }, user)
}

// Legacy Comments/StatusUpdate.
export function setCommentStatus(id: number, commentStatus: CommentStatus, user: string) {
  const comment = comments.find((c) => c.id === id)
  if (!comment || comment.status === "Deleted" || comment.commentStatus === commentStatus) return
  patch(id, { commentStatus }, user)
}

export function deleteComment(id: number, user: string) {
  const comment = comments.find((c) => c.id === id)
  if (!comment || comment.status === "Deleted") return
  patch(id, { status: "Deleted" }, user)
}

export function retrieveComment(id: number, user: string) {
  const comment = comments.find((c) => c.id === id)
  if (!comment || comment.status !== "Deleted") return
  patch(id, { status: "Active" }, user)
}

export function deleteCommentPermanently(id: number) {
  emit(comments.filter((c) => c.id !== id))
}

// A post deleted for good takes its comments with it.
export function removePostComments(postId: number) {
  if (comments.some((c) => c.postId === postId)) {
    emit(comments.filter((c) => c.postId !== postId))
  }
}

export function removeInstituteComments(instituteId: number) {
  emit(comments.filter((c) => c.instituteId !== instituteId))
}
