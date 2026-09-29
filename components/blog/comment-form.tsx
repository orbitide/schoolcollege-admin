"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { COMMENTS_HREF, NotFound, backTo } from "@/components/blog/blog-shared"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { commentStatuses, updateComment, useComment, type CommentStatus } from "@/lib/blog-comments"
import { postTitle, usePost } from "@/lib/blog-posts"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"

type Form = { authorName: string; email: string; website: string; content: string; commentStatus: CommentStatus }

// Legacy Comments/CreateEdit (edit only; comments are written on a post):
// the author's name, email and website, the comment and its status.
export function CommentForm({ id, returnTo }: { id: number; returnTo?: string }) {
  const router = useRouter()
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const comment = useComment(id)
  const post = usePost(comment?.postId ?? -1)
  const listHref = backTo(returnTo, COMMENTS_HREF)
  const [form, setForm] = React.useState<Form>(() => ({
    authorName: comment?.authorName ?? "",
    email: comment?.email ?? "",
    website: comment?.website ?? "",
    content: comment?.content ?? "",
    commentStatus: comment?.commentStatus ?? "Pending",
  }))
  const [errors, setErrors] = React.useState<Partial<Record<keyof Form, string>>>({})
  const ids = { name: React.useId(), email: React.useId(), website: React.useId(), content: React.useId() }

  if (
    !comment ||
    comment.status === "Deleted" ||
    !institutes.some((i) => i.id === comment.instituteId)
  ) {
    return <NotFound title="Comment not found" href={listHref} label="Back to comments" />
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function save(event: React.FormEvent) {
    event.preventDefault()
    const next: typeof errors = {
      authorName: form.authorName.trim() ? undefined : "Insert name.",
      content: form.content.trim() ? undefined : "Insert comment.",
      email:
        form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
          ? "Enter a valid email address."
          : undefined,
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    const { commentStatus, ...input } = form
    updateComment(id, input, commentStatus, user.name)
    toast.success("Comment updated successfully")
    router.push(listHref)
  }

  return (
    <form noValidate onSubmit={save} className="flex flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <Card className="max-w-3xl">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Edit Comment</CardTitle>
          <CardDescription>On “{post ? postTitle(post) : "a deleted post"}”</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.authorName}>
            <FieldLabel htmlFor={ids.name}>
              Name<span className="text-destructive" aria-hidden>*</span>
            </FieldLabel>
            <Input id={ids.name} value={form.authorName} aria-invalid={!!errors.authorName} onChange={(e) => set("authorName", e.target.value)} />
            <FieldError>{errors.authorName}</FieldError>
          </Field>
          <FilterField
            label="Status"
            value={form.commentStatus}
            onChange={(v) => set("commentStatus", v as CommentStatus)}
            options={commentStatuses.map((s) => ({ value: s, label: s }))}
          />
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor={ids.email}>Email</FieldLabel>
            <Input id={ids.email} type="email" value={form.email} aria-invalid={!!errors.email} onChange={(e) => set("email", e.target.value)} />
            <FieldError>{errors.email}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor={ids.website}>Website</FieldLabel>
            <Input id={ids.website} value={form.website} onChange={(e) => set("website", e.target.value)} />
          </Field>
          <Field data-invalid={!!errors.content} className="sm:col-span-2">
            <FieldLabel htmlFor={ids.content}>
              Comment<span className="text-destructive" aria-hidden>*</span>
            </FieldLabel>
            <Textarea id={ids.content} rows={5} value={form.content} aria-invalid={!!errors.content} onChange={(e) => set("content", e.target.value)} />
            <FieldError>{errors.content}</FieldError>
          </Field>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button asChild type="button" variant="outline">
            <Link href={listHref}>Back</Link>
          </Button>
          <Button type="submit">Update</Button>
        </CardFooter>
      </Card>
    </form>
  )
}
