"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  MY_POSTS_HREF,
  NotFound,
  POSTS_HREF,
  backTo,
} from "@/components/blog/blog-shared"
import { RichTextEditor } from "@/components/blog/rich-text-editor"
import { IMAGE_TYPES, ImageField } from "@/components/institutes/institute-form"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { categoryName, categoryTree, useAllCategories } from "@/lib/blog-categories"
import {
  DEFAULT_LANGUAGE,
  addPost,
  blogLanguages,
  fromLocalInput,
  isDuplicatePostSlug,
  plainText,
  postStatuses,
  postTitle,
  postVisibilities,
  toLocalInput,
  updatePost,
  useAllPosts,
  usePost,
  visibilityLabel,
  type BlogLanguage,
  type BlogPostInput,
  type PostStatus,
  type PostVisibility,
} from "@/lib/blog-posts"
import { ensureTags, useAllTags } from "@/lib/blog-tags"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { toSlug } from "@/lib/slug"
import { cn } from "@/lib/utils"

type Details = {
  title: string
  slug: string
  // The slug follows the title until it is typed in (legacy auto-slug).
  slugEdited: boolean
  content: string
  metaDescription: string
  metaKeyword: string
}

type Form = {
  instituteId: string
  translations: Record<BlogLanguage, Details>
  postStatus: PostStatus
  visibility: PostVisibility
  // <input type="datetime-local"> value
  publishDate: string
  parentId: string
  isFeatured: boolean
  isSticky: boolean
  allowComment: boolean
  thumbImage: string
  featuredImage: string
  categoryIds: number[]
  tags: string
}

// "en.title", "instituteId", ...
type Errors = Record<string, string | undefined>

const emptyDetails = (): Details => ({
  title: "",
  slug: "",
  slugEdited: false,
  content: "",
  metaDescription: "",
  metaKeyword: "",
})

const isBlank = (d: Details) =>
  !d.title.trim() && !d.slug.trim() && !plainText(d.content) && !d.content.includes("<img") &&
  !d.metaDescription.trim() && !d.metaKeyword.trim()

// Legacy Post/CreateEdit (and, with `author`, PostAuthor/CreateEdit "Create
// Post"): a tab per language (English is required, Bangla optional) with
// title, slug, content and SEO meta, beside the post's attributes,
// categories, tags and images. An author can't set the status or
// visibility, and can only open their own posts.
export function PostForm({
  id,
  author = false,
  initialInstituteId,
  returnTo,
}: {
  id?: number
  author?: boolean
  initialInstituteId?: number
  returnTo?: string
}) {
  const router = useRouter()
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const post = usePost(id ?? -1)
  const posts = useAllPosts()
  const categories = useAllCategories()
  const tags = useAllTags()
  const isNew = id == null
  const listHref = backTo(returnTo, author ? MY_POSTS_HREF : POSTS_HREF)
  const fixedInstitute = institutes.length === 1 ? institutes[0].id : undefined
  const preset = fixedInstitute ?? institutes.find((i) => i.id === initialInstituteId)?.id

  const blank = (): Form => ({
    instituteId: preset != null ? String(preset) : "",
    translations: { en: emptyDetails(), bn: emptyDetails() },
    postStatus: "Draft",
    visibility: "Public",
    publishDate: "",
    parentId: "",
    isFeatured: false,
    isSticky: false,
    allowComment: true,
    thumbImage: "",
    featuredImage: "",
    categoryIds: [],
    tags: "",
  })
  const [form, setForm] = React.useState<Form>(() => {
    if (!post) return blank()
    const tagOf = new Map(tags.map((t) => [t.id, t]))
    const details = (code: BlogLanguage): Details => {
      const d = post.translations[code]
      return d ? { ...d, slugEdited: true } : emptyDetails()
    }
    return {
      instituteId: String(post.instituteId),
      translations: { en: details("en"), bn: details("bn") },
      postStatus: post.postStatus,
      visibility: post.visibility,
      publishDate: toLocalInput(post.publishDate),
      parentId: post.parentId == null ? "" : String(post.parentId),
      isFeatured: post.isFeatured,
      isSticky: post.isSticky,
      allowComment: post.allowComment,
      thumbImage: post.thumbImage,
      featuredImage: post.featuredImage,
      categoryIds: post.categoryIds,
      tags: post.tagIds
        .map((t) => tagOf.get(t))
        .filter((t) => !!t && t.status !== "Deleted")
        .map((t) => t!.name)
        .join(", "),
    }
  })
  const [errors, setErrors] = React.useState<Errors>({})
  const [language, setLanguage] = React.useState<BlogLanguage>(DEFAULT_LANGUAGE)
  // Bumped to remount the editors when the form is reset.
  const [version, setVersion] = React.useState(0)

  const instituteId = Number(form.instituteId) || -1
  const institute = institutes.find((i) => i.id === instituteId)
  const tree = categoryTree(categories, instituteId).filter(
    ({ category }) => category.status === "Active" || form.categoryIds.includes(category.id)
  )
  const parents = posts.filter(
    (p) =>
      p.instituteId === instituteId &&
      p.id !== id &&
      p.status !== "Deleted" &&
      (p.postStatus === "Published" || String(p.id) === form.parentId)
  )
  const suggestions = tags.filter((t) => t.instituteId === instituteId && t.status === "Active")

  const mine = !post || post.authorId === user.id
  const foreign = !!post && !institutes.some((i) => i.id === post.instituteId)
  if (!isNew && (!post || post.status === "Deleted" || foreign || (author && !mine))) {
    return <NotFound title="Post not found" href={listHref} label="Back to posts" />
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value }
      // Categories and parent belong to the institute.
      if (key === "instituteId") {
        next.categoryIds = []
        next.parentId = ""
      }
      return next
    })
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function setDetails(code: BlogLanguage, changes: Partial<Details>) {
    setForm((current) => {
      const old = current.translations[code]
      const next = { ...old, ...changes }
      if (changes.title != null && !old.slugEdited) next.slug = toSlug(changes.title)
      if (changes.slug != null) next.slugEdited = changes.slug !== ""
      return { ...current, translations: { ...current.translations, [code]: next } }
    })
    setErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(changes)) delete next[`${code}.${key}`]
      if (changes.title != null) delete next[`${code}.slug`]
      return next
    })
  }

  function handleImage(key: "thumbImage" | "featuredImage", event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) {
      setErrors((current) => ({ ...current, [key]: "Only .jpg, .jpeg and .png images are accepted." }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => set(key, String(reader.result))
    reader.readAsDataURL(file)
  }

  function toggleCategory(categoryId: number, checked: boolean) {
    set(
      "categoryIds",
      checked ? [...form.categoryIds, categoryId] : form.categoryIds.filter((c) => c !== categoryId)
    )
  }

  function addTagName(name: string) {
    const names = form.tags.split(",").map((t) => t.trim()).filter(Boolean)
    if (names.some((n) => n.toLowerCase() === name.toLowerCase())) return
    set("tags", [...names, name].join(", "))
  }

  function save(mode: "save" | "new" | "publish") {
    const next: Errors = { instituteId: institute ? undefined : "Select institute." }
    const translations: BlogPostInput["translations"] = {}
    for (const { code, label } of blogLanguages) {
      const d = form.translations[code]
      // Only the default language must be written; an empty other one is dropped.
      if (code !== DEFAULT_LANGUAGE && isBlank(d)) continue
      const slug = toSlug(d.slug || d.title)
      if (!d.title.trim()) next[`${code}.title`] = `Insert the ${label} title.`
      if (!slug) next[`${code}.slug`] = `Insert the ${label} slug.`
      else if (institute && isDuplicatePostSlug(institute.id, code, slug, id))
        next[`${code}.slug`] = `Another post of this institute already uses this ${label} slug.`
      translations[code] = {
        title: d.title,
        slug,
        content: d.content,
        metaDescription: d.metaDescription,
        metaKeyword: d.metaKeyword,
      }
    }
    setErrors(next)
    const failed = Object.entries(next).filter(([, v]) => v)
    if (failed.length) {
      const tab = failed.map(([k]) => k.split(".")[0]).find((k) => k === "en" || k === "bn")
      if (tab && !failed.some(([k]) => k.startsWith(`${language}.`))) setLanguage(tab as BlogLanguage)
      return
    }

    const tagIds = ensureTags(
      institute!.id,
      form.tags.split(","),
      user.name
    )
    const keep = !isNew && author
    const input: BlogPostInput = {
      instituteId: institute!.id,
      translations,
      postStatus: mode === "publish" ? "Published" : keep ? post!.postStatus : author ? "Draft" : form.postStatus,
      visibility: keep ? post!.visibility : author ? "Public" : form.visibility,
      publishDate: fromLocalInput(form.publishDate),
      parentId: form.parentId ? Number(form.parentId) : null,
      isFeatured: form.isFeatured,
      isSticky: form.isSticky,
      allowComment: form.allowComment,
      thumbImage: form.thumbImage,
      featuredImage: form.featuredImage,
      categoryIds: form.categoryIds.filter((c) => categories.some((x) => x.id === c)),
      tagIds,
    }
    if (isNew) addPost(input, user)
    else updatePost(id, input, user.name)
    toast.success(
      mode === "publish"
        ? "Post published successfully"
        : isNew
          ? "Post saved successfully"
          : "Post updated successfully"
    )
    if (mode === "new") {
      setForm({ ...blank(), instituteId: form.instituteId })
      setErrors({})
      setLanguage(DEFAULT_LANGUAGE)
      setVersion((v) => v + 1)
    } else {
      router.push(listHref)
    }
  }

  const title = author
    ? isNew ? "Create Post" : "Edit My Post"
    : isNew ? "New Post" : "Edit Post"

  return (
    <form
      noValidate
      className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6"
      onSubmit={(event) => {
        event.preventDefault()
        save("save")
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {!isNew && post && (
            <p className="text-sm text-muted-foreground">
              {postTitle(post)} · by {post.authorName}
            </p>
          )}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>{author ? "My Post" : "Manage Post"}</Link>
        </Button>
      </div>

      <div className="grid items-start gap-4 md:gap-6 @5xl/main:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Content</CardTitle>
            <CardDescription>
              English is required. Leave Bangla empty to publish the post in English only.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {institutes.length > 1 && (
              <FilterField
                label="Institute"
                required
                value={form.instituteId}
                onChange={(v) => set("instituteId", v)}
                options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
                placeholder="Select an institute"
                error={errors.instituteId}
              />
            )}
            <Tabs value={language} onValueChange={(v) => setLanguage(v as BlogLanguage)}>
              <TabsList>
                {blogLanguages.map(({ code, label }) => {
                  const invalid = Object.entries(errors).some(([k, v]) => v && k.startsWith(`${code}.`))
                  return (
                    <TabsTrigger key={code} value={code} className={cn(invalid && "text-destructive")}>
                      {label}
                      {code === DEFAULT_LANGUAGE && " (D)"}
                      {invalid && <span className="size-1.5 rounded-full bg-destructive" aria-label="has errors" />}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
              {blogLanguages.map(({ code, label }) => {
                const d = form.translations[code]
                const required = code === DEFAULT_LANGUAGE || !isBlank(d)
                return (
                  <TabsContent key={code} value={code} className="mt-2 flex flex-col gap-4">
                    <TextField
                      label="Post Title"
                      required={required}
                      value={d.title}
                      onChange={(v) => setDetails(code, { title: v })}
                      placeholder={`${label} title`}
                      error={errors[`${code}.title`]}
                    />
                    <TextField
                      label="Slug"
                      required={required}
                      value={d.slug}
                      onChange={(v) => setDetails(code, { slug: v })}
                      placeholder="made-from-the-title"
                      hint="The post's address. Letters and digits of any language, joined by “-”."
                      error={errors[`${code}.slug`]}
                    />
                    <Field>
                      <FieldLabel htmlFor={`post-content-${code}`}>Content</FieldLabel>
                      <RichTextEditor
                        key={`${version}-${code}`}
                        id={`post-content-${code}`}
                        value={d.content}
                        onChange={(html) => setDetails(code, { content: html })}
                        placeholder={code === "bn" ? "পোস্ট লিখুন…" : "Write the post…"}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`post-meta-${code}`}>Meta Description</FieldLabel>
                      <Textarea
                        id={`post-meta-${code}`}
                        value={d.metaDescription}
                        maxLength={320}
                        onChange={(event) => setDetails(code, { metaDescription: event.target.value })}
                        placeholder="Shown by search engines and as the post's summary"
                      />
                      <FieldDescription>Left empty, the first 160 characters of the content are used.</FieldDescription>
                    </Field>
                    <TextField
                      label="Meta Keyword"
                      value={d.metaKeyword}
                      onChange={(v) => setDetails(code, { metaKeyword: v })}
                      placeholder="comma, separated, keywords"
                    />
                  </TabsContent>
                )
              })}
            </Tabs>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 md:gap-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">Attributes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!author && (
                <>
                  <FilterField
                    label="Status"
                    value={form.postStatus}
                    onChange={(v) => set("postStatus", v as PostStatus)}
                    options={postStatuses.map((s) => ({ value: s, label: s === "UnPublished" ? "Unpublished" : s }))}
                  />
                  <FilterField
                    label="Visibility"
                    value={form.visibility}
                    onChange={(v) => set("visibility", v as PostVisibility)}
                    options={postVisibilities.map((v) => ({ value: v, label: visibilityLabel[v] }))}
                  />
                </>
              )}
              <TextField
                label="Schedule Date"
                type="datetime-local"
                value={form.publishDate}
                onChange={(v) => set("publishDate", v)}
                hint="When the post goes live. Left empty, it is the moment it is published."
              />
              <FilterField
                label="Parent"
                value={form.parentId}
                onChange={(v) => set("parentId", v)}
                options={parents.map((p) => ({ value: String(p.id), label: postTitle(p) }))}
                allLabel="No parent"
                disabled={!institute}
              />
              <div className="flex flex-col gap-3">
                <CheckField label="Featured" checked={form.isFeatured} onChange={(v) => set("isFeatured", v)} />
                <CheckField label="Sticky (pinned on top)" checked={form.isSticky} onChange={(v) => set("isSticky", v)} />
                <CheckField label="Allow comments" checked={form.allowComment} onChange={(v) => set("allowComment", v)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">Categories</CardTitle>
            </CardHeader>
            <CardContent className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {!institute ? (
                <p className="text-sm text-muted-foreground">Select an institute first.</p>
              ) : tree.length ? (
                tree.map(({ category, level }) => (
                  <div key={category.id} style={{ paddingLeft: `${level * 1.25}rem` }}>
                    <CheckField
                      label={categoryName(category)}
                      checked={form.categoryIds.includes(category.id)}
                      onChange={(v) => toggleCategory(category.id, v)}
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  This institute has no categories yet. Add them in Blog › Category.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">Tags</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <TextField
                label="Tags"
                value={form.tags}
                onChange={(v) => set("tags", v)}
                placeholder="admission, result"
                hint="Separate tags with commas. New ones are created when the post is saved."
              />
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {suggestions.map((t) => (
                    <Button
                      key={t.id}
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => addTagName(t.name)}
                    >
                      + {t.name}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">Images</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ImageField
                name="post-thumb-image"
                label="Thumb Image"
                value={form.thumbImage}
                error={errors.thumbImage}
                onChange={(event) => handleImage("thumbImage", event)}
                onClear={() => set("thumbImage", "")}
              />
              <ImageField
                name="post-featured-image"
                label="Featured Image"
                value={form.featuredImage}
                error={errors.featuredImage}
                onChange={(event) => handleImage("featuredImage", event)}
                onClear={() => set("featuredImage", "")}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardFooter className="flex-wrap justify-end gap-2">
          <Button asChild type="button" variant="outline">
            <Link href={listHref}>Back</Link>
          </Button>
          {author ? (
            <Button type="submit">Save and exit</Button>
          ) : (
            <>
              {isNew && (
                <Button type="button" variant="secondary" onClick={() => save("new")}>
                  Save and new
                </Button>
              )}
              <Button type="submit" variant={post?.postStatus === "Published" ? "default" : "outline"}>
                {isNew ? "Save" : "Update"}
              </Button>
              {post?.postStatus !== "Published" && (
                <Button type="button" onClick={() => save("publish")}>
                  Publish
                </Button>
              )}
            </>
          )}
        </CardFooter>
      </Card>
    </form>
  )
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = React.useId()
  return (
    <Field orientation="horizontal">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <FieldLabel htmlFor={id} className="font-normal">
        {label}
      </FieldLabel>
    </Field>
  )
}

function TextField({
  label,
  required,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  hint,
}: {
  label: string
  required?: boolean
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  hint?: string
}) {
  const id = React.useId()
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </FieldLabel>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        aria-invalid={!!error}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint && !error && <FieldDescription>{hint}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  )
}
