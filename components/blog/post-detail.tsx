"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, MessageSquareIcon, PencilIcon, PinIcon, SendIcon, StarIcon, Undo2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  COMMENT_RESOURCE,
  CommentStatusBadge,
  DetailRows,
  MY_POSTS_HREF,
  NotFound,
  POST_RESOURCE,
  POSTS_HREF,
  PostStatusBadge,
  auditRows,
  backTo,
  withReturn,
} from "@/components/blog/blog-shared"
import { PostContent } from "@/components/blog/post-content"
import { StatusBadge } from "@/components/institutes/status-badge"
import { stamp } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { surfaceHref, useSurfaces } from "@/lib/access"
import { categoryName, useAllCategories } from "@/lib/blog-categories"
import {
  addComment,
  commentStatuses,
  setCommentStatus,
  useAllComments,
  type BlogComment,
} from "@/lib/blog-comments"
import {
  DEFAULT_LANGUAGE,
  blogLanguages,
  postTitle,
  togglePublishPost,
  useAllPosts,
  usePost,
  visibilityLabel,
  type BlogLanguage,
} from "@/lib/blog-posts"
import { useAllTags } from "@/lib/blog-tags"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"

// Legacy Post/Details: the post as the site shows it (featured image,
// content, categories, tags and approved comments), with its settings and
// history beside it. Comment moderators see every comment and can approve
// them here; anyone else sees the approved ones and their own. With
// `author` it is opened from My Post and only shows the user's own posts.
export function PostDetail({ id, returnTo, author = false }: { id: number; returnTo?: string; author?: boolean }) {
  const user = useCurrentUser()
  const post = usePost(id)
  const posts = useAllPosts()
  // Only posts of the user's own institutes open.
  const institute = useAccessibleInstitutes().find((i) => i.id === post?.instituteId)
  const categories = useAllCategories()
  const tags = useAllTags()
  const postSurfaces = useSurfaces(POST_RESOURCE)
  const commentSurfaces = useSurfaces(COMMENT_RESOURCE)
  const [picked, setPicked] = React.useState<BlogLanguage>(DEFAULT_LANGUAGE)
  const listHref = backTo(
    returnTo,
    author ? MY_POSTS_HREF : surfaceHref(POSTS_HREF, postSurfaces[0] ?? "View")
  )

  const mine = post?.authorId === user.id
  if (!post || !institute || (author && !mine) || (author && post.status === "Deleted")) {
    return <NotFound title="Post not found" href={listHref} label="Back to posts" />
  }

  const deleted = post.status === "Deleted"
  const canManage = postSurfaces.some((s) => s !== "View")
  const editHref = author || !canManage ? (mine ? `${MY_POSTS_HREF}/${post.id}/edit` : null) : `${POSTS_HREF}/${post.id}/edit`
  const languages = blogLanguages.filter((l) => post.translations[l.code])
  const language = post.translations[picked] ? picked : (languages[0]?.code ?? DEFAULT_LANGUAGE)
  const details = post.translations[language]
  const published = post.postStatus === "Published"
  const postCategories = post.categoryIds
    .map((c) => categories.find((x) => x.id === c))
    .filter((c) => !!c && c.status !== "Deleted")
  const postTags = post.tagIds
    .map((t) => tags.find((x) => x.id === t))
    .filter((t) => !!t && t.status !== "Deleted")
  const parent = posts.find((p) => p.id === post.parentId)

  const rows: [string, React.ReactNode][] = [
    ["Institute", institute.name],
    ["Post status", <PostStatusBadge key="s" status={post.postStatus} />],
    ["Visibility", visibilityLabel[post.visibility]],
    ["Publish date", post.publishDate ? stamp(post.publishDate) : "—"],
    ["Parent", parent ? postTitle(parent) : "—"],
    ["Featured", post.isFeatured ? "Yes" : "No"],
    ["Sticky", post.isSticky ? "Yes" : "No"],
    ["Comments", post.allowComment ? "Allowed" : "Closed"],
    ["Slug", details?.slug ?? "—"],
    ["Meta description", details?.metaDescription || "—"],
    ["Meta keyword", details?.metaKeyword || "—"],
    ["Author", post.authorName],
    ["Status", <StatusBadge key="st" status={post.status} />],
    ...auditRows(post),
  ]

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={listHref}>
            <ArrowLeftIcon data-icon="inline-start" />
            {author ? "My Post" : "Posts"}
          </Link>
        </Button>
        {!deleted && (
          <div className="flex flex-wrap gap-2">
            {canManage && !author && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  togglePublishPost(post.id, user.name)
                  toast.success(published ? "Post moved to draft" : "Post published successfully")
                }}
              >
                {published ? <Undo2Icon data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
                {published ? "Unpublish" : "Publish"}
              </Button>
            )}
            {editHref && (
              <Button asChild variant="outline" size="sm">
                <Link href={withReturn(editHref, listHref)}>
                  <PencilIcon data-icon="inline-start" />
                  Edit
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid items-start gap-4 md:gap-6 @5xl/main:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-4 md:gap-6">
          <Card className="overflow-hidden pt-0">
            {post.featuredImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.featuredImage} alt="" className="max-h-80 w-full object-cover" />
            )}
            <CardHeader className={post.featuredImage ? "" : "pt-6"}>
              {languages.length > 1 && (
                <Tabs value={language} onValueChange={(v) => setPicked(v as BlogLanguage)} className="mb-2">
                  <TabsList>
                    {languages.map((l) => (
                      <TabsTrigger key={l.code} value={l.code}>
                        {l.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-2xl">{details?.title}</CardTitle>
                {post.isFeatured && <StarIcon className="size-4 fill-amber-400 text-amber-500" aria-label="Featured" />}
                {post.isSticky && <PinIcon className="size-4 text-muted-foreground" aria-label="Sticky" />}
              </div>
              <CardDescription>
                {post.authorName}
                {" · "}
                {published && post.publishDate ? stamp(post.publishDate) : `${post.postStatus === "UnPublished" ? "Unpublished" : post.postStatus}, not on the site`}
              </CardDescription>
              {(postCategories.length > 0 || postTags.length > 0) && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {postCategories.map((c) => (
                    <Badge key={`c${c!.id}`} variant="secondary">
                      {categoryName(c!)}
                    </Badge>
                  ))}
                  {postTags.map((t) => (
                    <Badge key={`t${t!.id}`} variant="outline">
                      #{t!.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {details?.content ? (
                <PostContent html={details.content} />
              ) : (
                <p className="text-sm text-muted-foreground">This post has no content in this language.</p>
              )}
            </CardContent>
          </Card>

          <Comments
            postId={post.id}
            instituteId={post.instituteId}
            open={post.allowComment && !deleted}
            moderator={commentSurfaces.some((s) => s !== "View")}
          />
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base">Post details</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailRows rows={rows} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Legacy _Comments partial: the post's comments and a form to add one. A
// new comment waits for approval.
function Comments({
  postId,
  instituteId,
  open,
  moderator,
}: {
  postId: number
  instituteId: number
  open: boolean
  moderator: boolean
}) {
  const user = useCurrentUser()
  const all = useAllComments()
  const [content, setContent] = React.useState("")
  const [error, setError] = React.useState<string>()
  const id = React.useId()

  const comments = all
    .filter(
      (c) =>
        c.postId === postId &&
        c.status !== "Deleted" &&
        (moderator || c.commentStatus === "Approved" || c.authorId === user.id)
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!content.trim()) {
      setError("Write a comment first.")
      return
    }
    addComment(
      { instituteId, postId, content, authorName: user.name, email: user.email, website: "" },
      user
    )
    setContent("")
    toast.success("Comment posted. It shows once a moderator approves it.")
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquareIcon className="size-4" />
          Comments ({comments.filter((c) => c.commentStatus === "Approved").length})
        </CardTitle>
        {moderator && (
          <CardDescription>You moderate comments, so you also see the ones waiting for approval.</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {comments.length ? (
          <ul className="flex flex-col divide-y">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} moderator={moderator} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        )}
        {open ? (
          <form onSubmit={submit} noValidate className="flex flex-col gap-2">
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor={id}>Leave a comment as {user.name}</FieldLabel>
              <Textarea
                id={id}
                value={content}
                aria-invalid={!!error}
                onChange={(event) => {
                  setContent(event.target.value)
                  setError(undefined)
                }}
              />
              <FieldError>{error}</FieldError>
            </Field>
            <Button type="submit" size="sm" className="self-end">
              Post comment
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Comments are closed on this post.</p>
        )}
      </CardContent>
    </Card>
  )
}

function CommentItem({ comment, moderator }: { comment: BlogComment; moderator: boolean }) {
  const user = useCurrentUser()
  return (
    <li className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{comment.authorName}</span>
        <span className="text-xs text-muted-foreground">{stamp(comment.createdAt)}</span>
        {comment.commentStatus !== "Approved" && <CommentStatusBadge status={comment.commentStatus} />}
      </div>
      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
      {moderator && (
        <div className="flex flex-wrap gap-1">
          {commentStatuses
            .filter((s) => s !== comment.commentStatus)
            .map((s) => (
              <Button
                key={s}
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  setCommentStatus(comment.id, s, user.name)
                  toast.success(`Comment marked ${s.toLowerCase()}`)
                }}
              >
                {s === "Pending" ? "Mark pending" : s === "Approved" ? "Approve" : s === "Rejected" ? "Reject" : "Spam"}
              </Button>
            ))}
        </div>
      )}
    </li>
  )
}
