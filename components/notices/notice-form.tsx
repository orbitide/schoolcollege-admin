"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PaperclipIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { NoticeSmsDialog } from "@/components/notices/notice-sms-dialog"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { classStore } from "@/lib/academic-store"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import {
  addNotice,
  MAX_ATTACHMENT_BYTES,
  noticeAudiences,
  noticeCategories,
  noticeErrors,
  updateNotice,
  useNotice,
  type Notice,
  type NoticeErrors,
  type NoticeInput,
} from "@/lib/notices"

const today = () => new Date().toISOString().slice(0, 10)

// Notice › Add / Edit Notice. Leave the classes unticked for every class;
// a notice without an expiry date stays up until it is made inactive.
// Ticking "Send as SMS" opens the SMS dialog once it is saved.
export function NoticeForm({
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
  const notice = useNotice(id ?? -1)
  const isNew = id == null
  const listHref = returnTo?.startsWith("/") ? returnTo : "/notices"
  const fixed = institutes.length === 1 ? institutes[0].id : undefined

  const blank = (): NoticeInput => ({
    instituteId: fixed ?? institutes.find((i) => i.id === initialInstituteId)?.id ?? 0,
    title: "",
    body: "",
    category: "General",
    audience: "Everyone",
    classIds: [],
    publishDate: today(),
    expiryDate: "",
    isPinned: false,
    attachmentName: "",
    attachmentUrl: "",
  })
  const [form, setForm] = React.useState<NoticeInput>(() => (notice ? { ...notice } : blank()))
  const [errors, setErrors] = React.useState<NoticeErrors>({})
  const [withSms, setWithSms] = React.useState(false)
  const [smsFor, setSmsFor] = React.useState<Notice | null>(null)
  const [after, setAfter] = React.useState<"list" | "new">("list")
  const classes = classStore.useList(form.instituteId || -1)

  if (!isNew && (!notice || notice.status === "Deleted")) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Notice not found</h2>
        <p className="text-sm text-muted-foreground">It may have been deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>Back to notices</Link>
        </Button>
      </div>
    )
  }

  function set<K extends keyof NoticeInput>(key: K, value: NoticeInput[K]) {
    setForm((f) => ({ ...f, [key]: value, ...(key === "instituteId" && { classIds: [] }) }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function attach(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error("Keep the attachment within 2 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setForm((f) => ({ ...f, attachmentName: file.name, attachmentUrl: String(reader.result) }))
    }
    reader.readAsDataURL(file)
  }

  function done(andNew: boolean) {
    if (andNew) {
      setForm({ ...blank(), instituteId: form.instituteId })
      setErrors({})
    } else {
      router.push(listHref)
    }
  }

  function save(andNew: boolean) {
    const next = noticeErrors(form)
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    let saved: Notice | undefined
    if (isNew) {
      saved = addNotice(form, user.name)
      toast.success("Notice added successfully")
    } else {
      updateNotice(id, form, user.name)
      saved = { ...notice!, ...form }
      toast.success("Notice updated successfully")
    }
    if (withSms && saved) {
      setAfter(andNew ? "new" : "list")
      setSmsFor(saved)
      return
    }
    done(andNew)
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4 px-4 py-4 md:py-6 lg:px-6"
      onSubmit={(e) => {
        e.preventDefault()
        save(false)
      }}
    >
      <Card className="max-w-4xl">
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{isNew ? "Add Notice" : "Edit Notice"}</CardTitle>
            <CardDescription>It shows on the Notice Board from the publish date until it expires.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={listHref}>Manage notice</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {fixed == null && (
            <FilterField
              label="Institute"
              required
              value={form.instituteId ? String(form.instituteId) : ""}
              onChange={(v) => set("instituteId", Number(v))}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select an institute"
              error={errors.instituteId}
            />
          )}
          <Field data-invalid={!!errors.title} className="sm:col-span-2">
            <FieldLabel htmlFor="notice-title">
              Title<span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="notice-title"
              value={form.title}
              aria-invalid={!!errors.title}
              onChange={(e) => set("title", e.target.value)}
            />
            <FieldError>{errors.title}</FieldError>
          </Field>
          <FilterField
            label="Category"
            required
            value={form.category}
            onChange={(v) => set("category", v as NoticeInput["category"])}
            options={noticeCategories.map((c) => ({ value: c, label: c }))}
          />
          <FilterField
            label="For"
            required
            value={form.audience}
            onChange={(v) => set("audience", v as NoticeInput["audience"])}
            options={noticeAudiences.map((a) => ({ value: a, label: a }))}
          />
          {form.audience !== "Teachers" && classes.length > 0 && (
            <fieldset className="flex flex-col gap-2 sm:col-span-2">
              <legend className="mb-2 text-sm font-medium">Classes</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {classes.map((c) => (
                  <Label key={c.id} className="flex items-center gap-2 font-normal">
                    <Checkbox
                      checked={form.classIds.includes(c.id)}
                      onCheckedChange={(on) =>
                        set("classIds", on ? [...form.classIds, c.id] : form.classIds.filter((x) => x !== c.id))
                      }
                    />
                    {c.name}
                  </Label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">None ticked: every class.</p>
            </fieldset>
          )}
          <Field data-invalid={!!errors.publishDate}>
            <FieldLabel htmlFor="notice-publish">
              Publish date<span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="notice-publish"
              type="date"
              value={form.publishDate}
              onChange={(e) => set("publishDate", e.target.value)}
            />
            <FieldError>{errors.publishDate}</FieldError>
          </Field>
          <Field data-invalid={!!errors.expiryDate}>
            <FieldLabel htmlFor="notice-expiry">Expiry date</FieldLabel>
            <Input
              id="notice-expiry"
              type="date"
              value={form.expiryDate}
              onChange={(e) => set("expiryDate", e.target.value)}
            />
            <FieldDescription>Blank: until it is made inactive.</FieldDescription>
            <FieldError>{errors.expiryDate}</FieldError>
          </Field>
          <Field data-invalid={!!errors.body} className="sm:col-span-2">
            <FieldLabel htmlFor="notice-body">
              Notice<span className="text-destructive">*</span>
            </FieldLabel>
            <Textarea
              id="notice-body"
              rows={6}
              value={form.body}
              aria-invalid={!!errors.body}
              onChange={(e) => set("body", e.target.value)}
            />
            <FieldError>{errors.body}</FieldError>
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="notice-file">Attachment</FieldLabel>
            {form.attachmentName ? (
              <div className="flex items-center gap-2 text-sm">
                <PaperclipIcon className="size-4 text-muted-foreground" />
                <a href={form.attachmentUrl} download={form.attachmentName} className="underline">
                  {form.attachmentName}
                </a>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => setForm((f) => ({ ...f, attachmentName: "", attachmentUrl: "" }))}
                >
                  <XIcon />
                  <span className="sr-only">Remove attachment</span>
                </Button>
              </div>
            ) : (
              <Input
                id="notice-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => attach(e.target.files?.[0])}
              />
            )}
            <FieldDescription>PDF, image or Word file, up to 2 MB.</FieldDescription>
          </Field>
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox checked={form.isPinned} onCheckedChange={(on) => set("isPinned", on === true)} />
            Pin to the top of the notice board
          </Label>
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox checked={withSms} onCheckedChange={(on) => setWithSms(on === true)} />
            Send as SMS after saving
          </Label>
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
      <NoticeSmsDialog
        notice={smsFor}
        onClose={() => {
          setSmsFor(null)
          done(after === "new")
        }}
      />
    </form>
  )
}
