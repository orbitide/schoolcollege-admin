"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { HighlightedMessage } from "@/components/sms/sms-message"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { branchStore } from "@/lib/academic-store"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import {
  addSmsTemplate,
  fillTemplate,
  MAX_TEMPLATE_LENGTH,
  placeholder,
  smsAttendanceTypes,
  smsKeywords,
  smsLength,
  smsResultTypes,
  smsTemplateErrors,
  smsTypes,
  subTypeOf,
  unknownKeywords,
  updateSmsTemplate,
  useSmsTemplates,
  type SmsAttendanceType,
  type SmsResultType,
  type SmsTemplate,
  type SmsTemplateErrors,
  type SmsTemplateInput,
  type SmsType,
} from "@/lib/sms-templates"

// Legacy Sms/CreateEditSmsTemplate: a template's institute (and optionally
// branch), name, SMS type and message. Clicking a keyword puts it in the
// message at the cursor, as the legacy keyword list does; the side panel
// shows the message filled with sample values, its length and SMS parts.
export function SmsTemplateForm({
  templateId,
  instituteId: defaultInstituteId,
  type: defaultType,
  returnTo,
}: {
  templateId?: number
  instituteId?: number
  type?: string
  returnTo?: string
}) {
  const templates = useSmsTemplates()
  const existing = templateId ? templates.find((t) => t.id === templateId) : undefined
  const listHref = returnTo?.startsWith("/") ? returnTo : "/sms/templates"

  if (templateId && (!existing || existing.status === "Deleted")) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">SMS template not found</h2>
        <p className="text-sm text-muted-foreground">
          It may have been deleted. Retrieve it from the list to edit it.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>Back to SMS templates</Link>
        </Button>
      </div>
    )
  }

  return (
    <FormBody
      key={existing?.id ?? "new"}
      existing={existing}
      defaultInstituteId={defaultInstituteId}
      defaultType={smsTypes.find((t) => t === defaultType) ?? ""}
      listHref={listHref}
    />
  )
}

function FormBody({
  existing,
  defaultInstituteId,
  defaultType,
  listHref,
}: {
  existing?: SmsTemplate
  defaultInstituteId?: number
  defaultType: SmsType | ""
  listHref: string
}) {
  const router = useRouter()
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const isNew = !existing
  const messageRef = React.useRef<HTMLTextAreaElement>(null)

  const startInstitute =
    institutes.find((i) => i.id === (existing?.instituteId ?? defaultInstituteId)) ??
    (institutes.length === 1 ? institutes[0] : undefined)
  const [instituteId, setInstituteId] = React.useState(startInstitute ? String(startInstitute.id) : "")
  const [branchId, setBranchId] = React.useState(existing?.branchId != null ? String(existing.branchId) : "")
  const [name, setName] = React.useState(existing?.name ?? "")
  const [smsType, setSmsType] = React.useState<SmsType | "">(existing?.smsType ?? defaultType)
  const [resultType, setResultType] = React.useState<SmsResultType | "">(existing?.resultType ?? "")
  const [attendanceType, setAttendanceType] = React.useState<SmsAttendanceType | "">(
    existing?.attendanceType ?? ""
  )
  const [message, setMessage] = React.useState(existing?.message ?? "")
  const [errors, setErrors] = React.useState<SmsTemplateErrors>({})

  const institute = institutes.find((i) => String(i.id) === instituteId)
  const branches = branchStore.useList(institute?.id ?? -1)
  const sub = subTypeOf(smsType)
  const keywords = smsKeywords(smsType)
  const groups = [...new Set(keywords.map((k) => k.group ?? ""))]
  const unknown = unknownKeywords(smsType, message)
  const filled = fillTemplate(message)
  const length = smsLength(filled)
  const rate = institute?.configuration.smsRate ?? 0

  function input(): SmsTemplateInput {
    return {
      instituteId: Number(instituteId) || 0,
      branchId: branchId ? Number(branchId) : null,
      name,
      smsType: smsType as SmsType,
      resultType: resultType || null,
      attendanceType: attendanceType || null,
      message,
    }
  }

  // Puts the keyword where the cursor is (or replaces the selection) and
  // leaves the cursor after it.
  function insertKeyword(keyword: string) {
    const text = placeholder(keyword)
    const area = messageRef.current
    const start = area?.selectionStart ?? message.length
    const end = area?.selectionEnd ?? message.length
    const next = message.slice(0, start) + text + message.slice(end)
    setMessage(next)
    setErrors((current) => ({ ...current, message: undefined }))
    requestAnimationFrame(() => {
      area?.focus()
      area?.setSelectionRange(start + text.length, start + text.length)
    })
  }

  function save(andNew: boolean) {
    const values = input()
    const next = smsTemplateErrors(values, existing?.id)
    setErrors(next)
    if (Object.values(next).some(Boolean)) {
      toast.error("Check the highlighted fields.")
      return
    }
    try {
      if (existing) {
        updateSmsTemplate(existing.id, values, user.name)
        toast.success("SMS template updated successfully")
      } else {
        addSmsTemplate(values, user.name)
        toast.success("SMS template added successfully")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The template could not be saved.")
      return
    }
    if (andNew) {
      // Keep the institute, branch and type; start the next message blank.
      setName("")
      setMessage("")
      setErrors({})
      return
    }
    router.push(listHref)
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        save(false)
      }}
      noValidate
      className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6"
    >
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={listHref}>
          <ArrowLeftIcon data-icon="inline-start" />
          SMS templates
        </Link>
      </Button>

      <h2 className="text-xl font-semibold tracking-tight">
        {existing ? `Edit ${existing.name}` : "Add SMS template"}
      </h2>

      <div className="grid items-start gap-4 md:gap-6 @4xl/main:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Template</CardTitle>
              <CardDescription>
                Who it is for. Send SMS offers the template for its SMS type
                {sub === "result" ? " and result" : sub === "attendance" ? " and attendance" : ""}.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {institutes.length > 1 && (
                <FilterField
                  label="Institute"
                  required
                  value={instituteId}
                  onChange={(v) => {
                    setInstituteId(v)
                    setBranchId("")
                    setErrors((current) => ({ ...current, instituteId: undefined, name: undefined }))
                  }}
                  options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
                  placeholder="Select institute"
                  error={errors.instituteId}
                  disabled={!isNew}
                />
              )}
              {institute?.enableBranch && (
                <FilterField
                  label="Branch"
                  value={branchId}
                  onChange={setBranchId}
                  options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                  allLabel="All branches"
                  error={errors.branchId}
                />
              )}
              <Field data-invalid={!!errors.name} className="sm:col-span-2">
                <FieldLabel htmlFor="template-name">
                  Template name
                  <span className="text-destructive" aria-hidden>
                    *
                  </span>
                </FieldLabel>
                <Input
                  id="template-name"
                  value={name}
                  maxLength={100}
                  placeholder="e.g. Absent today"
                  aria-invalid={!!errors.name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setErrors((current) => ({ ...current, name: undefined }))
                  }}
                />
                <FieldError>{errors.name}</FieldError>
              </Field>
              <FilterField
                label="SMS type"
                required
                value={smsType}
                onChange={(v) => {
                  setSmsType(v as SmsType)
                  setResultType("")
                  setAttendanceType("")
                  setErrors((current) => ({
                    ...current,
                    smsType: undefined,
                    resultType: undefined,
                    attendanceType: undefined,
                  }))
                }}
                options={smsTypes.map((t) => ({ value: t, label: t }))}
                placeholder="Select SMS type"
                error={errors.smsType}
              />
              {sub === "result" && (
                <FilterField
                  label="Result type"
                  required
                  value={resultType}
                  onChange={(v) => {
                    setResultType(v as SmsResultType)
                    setErrors((current) => ({ ...current, resultType: undefined }))
                  }}
                  options={smsResultTypes.map((t) => ({
                    value: t,
                    label: t === "All" ? "All students" : `${t}ed students`,
                  }))}
                  placeholder="Select result type"
                  error={errors.resultType}
                />
              )}
              {sub === "attendance" && (
                <FilterField
                  label="Attendance type"
                  required
                  value={attendanceType}
                  onChange={(v) => {
                    setAttendanceType(v as SmsAttendanceType)
                    setErrors((current) => ({ ...current, attendanceType: undefined }))
                  }}
                  options={smsAttendanceTypes.map((t) => ({
                    value: t,
                    label: t === "Present" ? "Present students" : "Absent students",
                  }))}
                  placeholder="Select attendance type"
                  error={errors.attendanceType}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message</CardTitle>
              <CardDescription>
                {smsType
                  ? "Click a keyword to put it at the cursor; it is filled in for each student."
                  : "Pick the SMS type to see the keywords it can fill."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {groups.map((group) => (
                <div key={group || "main"} className="flex flex-col gap-2">
                  {group && (
                    <p className="text-xs text-muted-foreground">
                      {group}: filled only when the result SMS is sent for one subject.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {keywords
                      .filter((k) => (k.group ?? "") === group)
                      .map((k) => (
                        <Button
                          key={k.label}
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 font-mono text-xs"
                          onClick={() => insertKeyword(k.label)}
                        >
                          {placeholder(k.label)}
                        </Button>
                      ))}
                  </div>
                </div>
              ))}
              <Field data-invalid={!!errors.message}>
                <FieldLabel htmlFor="template-message">
                  Message
                  <span className="text-destructive" aria-hidden>
                    *
                  </span>
                </FieldLabel>
                <Textarea
                  id="template-message"
                  ref={messageRef}
                  rows={7}
                  value={message}
                  maxLength={MAX_TEMPLATE_LENGTH}
                  placeholder="Dear guardian, [{Name}] of [{Class}] was absent on [{AttendanceDate}]."
                  aria-invalid={!!errors.message}
                  onChange={(event) => {
                    setMessage(event.target.value)
                    setErrors((current) => ({ ...current, message: undefined }))
                  }}
                />
                <FieldDescription>
                  {message.length}/{MAX_TEMPLATE_LENGTH} characters in the template.
                </FieldDescription>
                <FieldError>{errors.message}</FieldError>
              </Field>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button type="submit">{existing ? "Update template" : "Save template"}</Button>
            {isNew && (
              <Button type="button" variant="outline" onClick={() => save(true)}>
                Save and add another
              </Button>
            )}
            <Button asChild type="button" variant="ghost">
              <Link href={listHref}>Cancel</Link>
            </Button>
          </div>
        </div>

        <Card className="@4xl/main:sticky @4xl/main:top-4">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Filled with sample values, as a guardian would get it.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <div className="min-h-20 rounded-2xl rounded-bl-sm bg-muted px-4 py-3 leading-relaxed">
              {message.trim() ? (
                <span className="whitespace-pre-wrap break-words">{filled}</span>
              ) : (
                <span className="text-muted-foreground">The message shows here as you type.</span>
              )}
            </div>

            <dl className="grid grid-cols-3 divide-x rounded-lg border text-center">
              <div className="flex flex-col gap-0.5 px-2 py-2">
                <dt className="text-xs text-muted-foreground">Characters</dt>
                <dd className="text-lg font-semibold tabular-nums">{length.chars}</dd>
              </div>
              <div className="flex flex-col gap-0.5 px-2 py-2">
                <dt className="text-xs text-muted-foreground">SMS parts</dt>
                <dd className="text-lg font-semibold tabular-nums">{length.parts}</dd>
              </div>
              <div className="flex flex-col gap-0.5 px-2 py-2">
                <dt className="text-xs text-muted-foreground">Cost / student</dt>
                <dd className="text-lg font-semibold tabular-nums">৳{(length.parts * rate).toFixed(2)}</dd>
              </div>
            </dl>
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {length.unicode ? (
                <>
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                    Unicode
                  </Badge>
                  Bangla or special characters: 70 per SMS, 67 per part when longer.
                </>
              ) : (
                "Plain text: 160 per SMS, 153 per part when longer."
              )}{" "}
              {institute ? `At ৳${rate} per SMS (institute configuration).` : ""}
            </p>

            {unknown.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                <span>
                  {smsType ? `${smsType} SMS can't fill ` : "Pick the SMS type to check "}
                  {unknown.map(placeholder).join(", ")}
                  {smsType ? "; they would be sent as written." : "."}
                </span>
              </div>
            )}

            {message.trim() && (
              <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">Template</p>
                <HighlightedMessage message={message} unknown={smsType ? unknown : []} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
