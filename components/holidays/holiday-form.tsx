"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

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
import { Textarea } from "@/components/ui/textarea"
import { classStore } from "@/lib/academic-store"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import {
  addHoliday,
  isDuplicateHolidayName,
  jsWeekdays,
  parseIsoDate,
  updateHoliday,
  useHoliday,
  type HolidayInput,
} from "@/lib/holidays"
import { academicMediums, holidayTypes, repetitions, type Institute } from "@/lib/institutes"

type Form = {
  instituteId: string
  medium: string
  classId: string
  name: string
  startDate: string
  endDate: string
  type: string
  repetition: string
  description: string
}
type Errors = Partial<Record<keyof Form, string>>

const today = () => new Date().toISOString().slice(0, 10)

// Legacy HolidayAndEventSettings/CreateEdit: institute, then optionally one
// medium and/or class, the name, dates, type and repetition. The name is
// unique within its institute, medium and class; a new one goes last in rank
// there. `instituteId` fixes the institute (its Holidays tab);
// `initialInstituteId` only preselects it.
export function HolidayForm({
  id,
  instituteId,
  initialInstituteId,
  returnTo,
}: {
  id?: number
  instituteId?: number
  initialInstituteId?: number
  returnTo?: string
}) {
  const router = useRouter()
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const holiday = useHoliday(id ?? -1)
  const isNew = id == null
  const fixedInstitute = instituteId ?? (institutes.length === 1 ? institutes[0].id : undefined)
  const listHref = returnTo?.startsWith("/")
    ? returnTo
    : instituteId != null
      ? `/institutes/${instituteId}/holidays`
      : "/basic-settings/holidays"

  const preset =
    fixedInstitute ?? institutes.find((i) => i.id === initialInstituteId)?.id
  const blank = (): Form => ({
    instituteId: preset != null ? String(preset) : "",
    medium: "",
    classId: "",
    name: "",
    startDate: today(),
    endDate: today(),
    type: "",
    repetition: "",
    description: "",
  })
  const [form, setForm] = React.useState<Form>(() =>
    holiday
      ? {
          instituteId: String(holiday.instituteId),
          medium: holiday.medium,
          classId: holiday.classId == null ? "" : String(holiday.classId),
          name: holiday.name,
          startDate: holiday.startDate,
          endDate: holiday.endDate,
          type: holiday.type,
          repetition: holiday.repetition,
          description: holiday.description,
        }
      : blank()
  )
  const [errors, setErrors] = React.useState<Errors>({})
  const classes = classStore.useList(Number(form.instituteId) || -1)

  const institute = institutes.find((i) => String(i.id) === form.instituteId)
  // Legacy LoadAcademicClass: the institute's active classes of the medium.
  const classOptions = classes.filter(
    (c) =>
      (c.status === "Active" || String(c.id) === form.classId) &&
      (!form.medium || !c.medium || c.medium === form.medium)
  )

  if (!isNew && (!holiday || holiday.status === "Deleted")) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Holiday and event not found</h2>
        <p className="text-sm text-muted-foreground">It may have been deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>Back to holidays and events</Link>
        </Button>
      </div>
    )
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === "instituteId") {
        next.medium = ""
        next.classId = ""
      }
      if (key === "medium") next.classId = ""
      return next
    })
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function save(andNew: boolean) {
    const input: HolidayInput = {
      instituteId: Number(form.instituteId),
      medium: institute?.enableMedium ? form.medium : "",
      classId: form.classId ? Number(form.classId) : null,
      name: form.name,
      startDate: form.startDate,
      endDate: form.endDate,
      type: form.type as HolidayInput["type"],
      repetition: form.repetition as HolidayInput["repetition"],
      description: form.description,
    }
    const next: Errors = {
      instituteId: institute ? undefined : "Select institute.",
      name: !form.name.trim()
        ? "Insert holiday and event name."
        : institute && isDuplicateHolidayName(input, id)
          ? "Duplicate name found for this institute, medium and class."
          : undefined,
      startDate: form.startDate ? undefined : "Start date is required.",
      endDate: !form.endDate
        ? "End date is required."
        : form.startDate && form.endDate < form.startDate
          ? "Start date must be before end date."
          : undefined,
      type: form.type ? undefined : "Select type.",
      repetition: form.repetition ? undefined : "Select repetition.",
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    if (isNew) {
      addHoliday(input, user.name)
      toast.success("Holiday and event added successfully")
    } else {
      updateHoliday(id, input, user.name)
      toast.success("Holiday and event updated successfully")
    }
    if (andNew) {
      setForm({ ...blank(), instituteId: form.instituteId, medium: form.medium, classId: form.classId })
      setErrors({})
    } else {
      router.push(listHref)
    }
  }

  return (
    <form
      noValidate
      className={instituteId != null ? "flex flex-col gap-4" : "flex flex-col gap-4 px-4 py-4 md:py-6 lg:px-6"}
      onSubmit={(event) => {
        event.preventDefault()
        save(false)
      }}
    >
      <Card className="max-w-4xl">
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">
              {isNew ? "Add Holiday and Event" : "Edit Holiday and Event"}
            </CardTitle>
            <CardDescription>
              Leave medium and class on “All” for a holiday of the whole institute.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={listHref}>Manage holiday and event</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {fixedInstitute == null && (
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
          {institute?.enableMedium && (
            <FilterField
              label="Academic Medium"
              value={form.medium}
              onChange={(v) => set("medium", v)}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              allLabel="All Academic Medium"
            />
          )}
          <FilterField
            label="Academic Class"
            value={form.classId}
            onChange={(v) => set("classId", v)}
            options={classOptions.map((c) => ({ value: String(c.id), label: c.name }))}
            allLabel="All Academic Class"
            disabled={!institute}
          />
          <TextField
            label="Name"
            required
            value={form.name}
            onChange={(v) => set("name", v)}
            placeholder="Enter name"
            error={errors.name}
          />
          <TextField
            label="Start Date"
            type="date"
            required
            value={form.startDate}
            onChange={(v) => set("startDate", v)}
            error={errors.startDate}
            hint={weekendHint(form.startDate, institute)}
          />
          <TextField
            label="End Date"
            type="date"
            required
            value={form.endDate}
            onChange={(v) => set("endDate", v)}
            error={errors.endDate}
            hint={form.endDate !== form.startDate ? weekendHint(form.endDate, institute) : undefined}
          />
          <FilterField
            label="Type"
            required
            value={form.type}
            onChange={(v) => set("type", v)}
            options={holidayTypes.map((t) => ({ value: t, label: t }))}
            placeholder="Select type"
            error={errors.type}
          />
          <FilterField
            label="Repetition"
            required
            value={form.repetition}
            onChange={(v) => set("repetition", v)}
            options={repetitions.map((r) => ({ value: r, label: r }))}
            placeholder="Select repetition"
            error={errors.repetition}
          />
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="holiday-description">Description</FieldLabel>
            <Textarea
              id="holiday-description"
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
            />
          </Field>
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

function weekendHint(date: string, institute?: Institute) {
  if (!date || !institute) return undefined
  const weekday = jsWeekdays[parseIsoDate(date).getDay()]
  return (institute.weekend as string[]).includes(weekday)
    ? `This is a ${weekday}, already a weekend for this institute.`
    : undefined
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
