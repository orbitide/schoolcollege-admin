"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { CATEGORIES_HREF, NotFound, backTo } from "@/components/blog/blog-shared"
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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  addCategory,
  categoryDepth,
  categoryName,
  isDuplicateCategorySlug,
  parentOptions,
  updateCategory,
  useAllCategories,
  useCategory,
  type BlogCategoryInput,
} from "@/lib/blog-categories"
import { DEFAULT_LANGUAGE, blogLanguages, type BlogLanguage } from "@/lib/blog-posts"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { toSlug } from "@/lib/slug"

type Details = { name: string; slug: string; slugEdited: boolean; title: string }
type Form = {
  instituteId: string
  parentId: string
  image: string
  translations: Record<BlogLanguage, Details>
}
type Errors = Record<string, string | undefined>

const emptyDetails = (): Details => ({ name: "", slug: "", slugEdited: false, title: "" })
const isBlank = (d: Details) => !d.name.trim() && !d.slug.trim() && !d.title.trim()

// Legacy Category/CreateEdit: per language the name, slug and browser
// title (English required), then the parent and image.
export function CategoryForm({
  id,
  initialInstituteId,
  returnTo,
}: {
  id?: number
  initialInstituteId?: number
  returnTo?: string
}) {
  const router = useRouter()
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const categories = useAllCategories()
  const category = useCategory(id ?? -1)
  const isNew = id == null
  const listHref = backTo(returnTo, CATEGORIES_HREF)
  const fixedInstitute = institutes.length === 1 ? institutes[0].id : undefined
  const preset = fixedInstitute ?? institutes.find((i) => i.id === initialInstituteId)?.id

  const blank = (): Form => ({
    instituteId: preset != null ? String(preset) : "",
    parentId: "",
    image: "",
    translations: { en: emptyDetails(), bn: emptyDetails() },
  })
  const [form, setForm] = React.useState<Form>(() => {
    if (!category) return blank()
    const details = (code: BlogLanguage): Details => {
      const d = category.translations[code]
      return d ? { ...d, slugEdited: true } : emptyDetails()
    }
    return {
      instituteId: String(category.instituteId),
      parentId: category.parentId == null ? "" : String(category.parentId),
      image: category.image,
      translations: { en: details("en"), bn: details("bn") },
    }
  })
  const [errors, setErrors] = React.useState<Errors>({})

  const institute = institutes.find((i) => String(i.id) === form.instituteId)
  const parents = institute ? parentOptions(categories, institute.id, id) : []

  if (
    !isNew &&
    (!category || category.status === "Deleted" || !institutes.some((i) => i.id === category.instituteId))
  ) {
    return <NotFound title="Category not found" href={listHref} label="Back to categories" />
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "instituteId" && { parentId: "" }),
    }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function setDetails(code: BlogLanguage, changes: Partial<Details>) {
    setForm((current) => {
      const old = current.translations[code]
      const next = { ...old, ...changes }
      if (changes.name != null && !old.slugEdited) next.slug = toSlug(changes.name)
      if (changes.slug != null) next.slugEdited = changes.slug !== ""
      return { ...current, translations: { ...current.translations, [code]: next } }
    })
    setErrors((current) => ({
      ...current,
      [`${code}.name`]: undefined,
      [`${code}.slug`]: undefined,
    }))
  }

  function handleImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) {
      setErrors((current) => ({ ...current, image: "Only .jpg, .jpeg and .png images are accepted." }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => set("image", String(reader.result))
    reader.readAsDataURL(file)
  }

  function save(andNew: boolean) {
    const next: Errors = { instituteId: institute ? undefined : "Select institute." }
    const translations: BlogCategoryInput["translations"] = {}
    for (const { code, label } of blogLanguages) {
      const d = form.translations[code]
      if (code !== DEFAULT_LANGUAGE && isBlank(d)) continue
      const slug = toSlug(d.slug || d.name)
      if (!d.name.trim()) next[`${code}.name`] = `Insert the ${label} name.`
      if (!slug) next[`${code}.slug`] = `Insert the ${label} slug.`
      else if (institute && isDuplicateCategorySlug(institute.id, code, slug, id))
        next[`${code}.slug`] = `Another category of this institute already uses this ${label} slug.`
      translations[code] = { name: d.name, slug, title: d.title }
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    const input: BlogCategoryInput = {
      instituteId: institute!.id,
      parentId: form.parentId ? Number(form.parentId) : null,
      image: form.image,
      translations,
    }
    if (isNew) {
      addCategory(input, user.name)
      toast.success("Category saved successfully")
    } else {
      updateCategory(id, input, user.name)
      toast.success("Category updated successfully")
    }
    if (andNew) {
      setForm({ ...blank(), instituteId: form.instituteId, parentId: form.parentId })
      setErrors({})
    } else {
      router.push(listHref)
    }
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4 px-4 py-4 md:py-6 lg:px-6"
      onSubmit={(event) => {
        event.preventDefault()
        save(false)
      }}
    >
      <Card className="max-w-4xl">
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{isNew ? "Add Category" : "Edit Category"}</CardTitle>
            <CardDescription>English is required; Bangla is optional.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={listHref}>Manage category</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
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
          <FilterField
            label="Parent"
            value={form.parentId}
            onChange={(v) => set("parentId", v)}
            options={parents.map((c) => ({
              value: String(c.id),
              label: `${"— ".repeat(categoryDepth(categories, c) - 1)}${categoryName(c)}`,
            }))}
            allLabel="No parent (top level)"
            disabled={!institute}
          />
          {blogLanguages.map(({ code, label }) => {
            const d = form.translations[code]
            const required = code === DEFAULT_LANGUAGE || !isBlank(d)
            return (
              <fieldset key={code} className="grid gap-4 rounded-lg border p-4 sm:col-span-2 sm:grid-cols-3">
                <legend className="px-1 text-sm font-medium">
                  {label}
                  {code === DEFAULT_LANGUAGE && " (D)"}
                </legend>
                <TextField
                  label="Name"
                  required={required}
                  value={d.name}
                  onChange={(v) => setDetails(code, { name: v })}
                  error={errors[`${code}.name`]}
                />
                <TextField
                  label="Slug"
                  required={required}
                  value={d.slug}
                  onChange={(v) => setDetails(code, { slug: v })}
                  error={errors[`${code}.slug`]}
                />
                <TextField
                  label="Browser Title"
                  value={d.title}
                  onChange={(v) => setDetails(code, { title: v })}
                  hint="Left empty, the name is used."
                />
              </fieldset>
            )
          })}
          <ImageField
            name="category-image"
            label="Image"
            value={form.image}
            error={errors.image}
            onChange={handleImage}
            onClear={() => set("image", "")}
          />
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button asChild type="button" variant="outline">
            <Link href={listHref}>Back</Link>
          </Button>
          {isNew && (
            <Button type="button" variant="secondary" onClick={() => save(true)}>
              Save and new
            </Button>
          )}
          <Button type="submit">{isNew ? "Save" : "Update"}</Button>
        </CardFooter>
      </Card>
    </form>
  )
}

function TextField({
  label,
  required,
  value,
  onChange,
  error,
  hint,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
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
      <Input id={id} value={value} aria-invalid={!!error} onChange={(event) => onChange(event.target.value)} />
      {hint && !error && <FieldDescription>{hint}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  )
}
