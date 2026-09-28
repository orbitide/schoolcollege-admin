"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import type { EditableRecord, Errors } from "@/components/institutes/academic/kinds"
import { SelectField } from "@/components/institutes/institute-form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  classStore,
  classYearSubjectStore,
  groupStore,
  subjectStore,
  yearStore,
} from "@/lib/academic-store"
import {
  academicMediums,
  recordStatuses,
  subjectTypes,
  type ClassYearSubject,
  type ClassYearSubjectDetail,
  type Institute,
  editableStatus,
  type RecordStatus,
} from "@/lib/institutes"
import { cn } from "@/lib/utils"

// Radix Select can't use "" as a value, so optional selects map "" to this.
const NONE = "__none"

// The marked parts of a subject, as [marks, pass marks] field pairs.
const markParts = [
  { label: "Theory", marks: "theoryMarks", pass: "theoryPassMarks" },
  { label: "CQ", marks: "cqMarks", pass: "cqPassMarks" },
  { label: "MCQ", marks: "mcqMarks", pass: "mcqPassMarks" },
  { label: "Practical", marks: "practicalMarks", pass: "practicalPassMarks" },
  { label: "Class test", marks: "classTestMarks", pass: "classTestPassMarks" },
] as const

const mcqFields = [
  { label: "MCQ marks per question", key: "mcqMarksPerQuestion" },
  { label: "Negative MCQ marks", key: "negativeMcqMarks" },
] as const

type NumberKey =
  | (typeof markParts)[number]["marks"]
  | (typeof markParts)[number]["pass"]
  | (typeof mcqFields)[number]["key"]

const numberKeys: NumberKey[] = [
  ...markParts.flatMap((part) => [part.marks, part.pass]),
  ...mcqFields.map((field) => field.key),
]

// Inputs stay as strings until submit.
type Row = {
  key: number
  subjectId: string
  subjectType: ClassYearSubjectDetail["subjectType"]
  groupId: string
  isAcceptPartial: boolean
} & Record<NumberKey, string>

let nextRowKey = 1

function toRow(detail?: ClassYearSubjectDetail): Row {
  return {
    key: nextRowKey++,
    subjectId: detail ? String(detail.subjectId) : "",
    subjectType: detail?.subjectType ?? "Compulsory",
    groupId: detail?.groupId == null ? "" : String(detail.groupId),
    isAcceptPartial: detail?.isAcceptPartial ?? false,
    ...(Object.fromEntries(
      numberKeys.map((key) => [key, String(detail?.[key] ?? 0)])
    ) as Record<NumberKey, string>),
  }
}

const num = (value: string) => (value.trim() === "" ? 0 : Number(value))

function totals(row: Row) {
  return {
    totalMarks: markParts.reduce((sum, part) => sum + num(row[part.marks]), 0),
    totalPassMarks: markParts.reduce((sum, part) => sum + num(row[part.pass]), 0),
  }
}

// Legacy ClassYearSubject Create/Edit: pick the class, year and medium, then
// list every subject the class takes with its marks split.
export function ClassYearSubjectForm({
  institute,
  record,
  singular,
  plural,
  listHref,
}: {
  institute: Institute
  record?: EditableRecord
  singular: string
  plural: string
  listHref: string
}) {
  const existing = record as ClassYearSubject | undefined
  const router = useRouter()
  const classes = classStore.useList(institute.id)
  const years = yearStore.useList(institute.id)
  const subjects = subjectStore.useList(institute.id)
  const groups = groupStore.useList(institute.id)

  const [medium, setMedium] = React.useState(
    existing?.medium || (institute.enableMedium ? academicMediums[0] : "")
  )
  const [classId, setClassId] = React.useState(existing ? String(existing.classId) : "")
  const [yearId, setYearId] = React.useState(() => {
    if (existing) return String(existing.yearId)
    const current = years.find((year) => year.isCurrent)
    return current ? String(current.id) : ""
  })
  const [perStudent, setPerStudent] = React.useState(
    String(existing?.perStudentSubjectCount ?? "")
  )
  const [status, setStatus] = React.useState<RecordStatus>(editableStatus(existing?.status))
  const [rows, setRows] = React.useState<Row[]>(() =>
    existing?.details.length ? existing.details.map(toRow) : [toRow()]
  )
  const [errors, setErrors] = React.useState<Errors>({})

  const lower = singular.toLowerCase()
  const selectedClass = classes.find((c) => String(c.id) === classId)
  // Groups only apply when the class splits into subject groups.
  const classGroups =
    institute.enableGroup && selectedClass?.hasSubjectGroup
      ? groups.filter((group) => selectedClass.groupIds.includes(group.id))
      : []

  const active = <T extends { id: number; status: string }>(list: T[], current: string) =>
    list.filter((item) => item.status === "Active" || String(item.id) === current)

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  // Picking a subject on an unmarked row starts it from the catalog marks.
  function pickSubject(row: Row, subjectId: string) {
    const subject = subjects.find((s) => String(s.id) === subjectId)
    const unmarked = markParts.every((part) => !num(row[part.marks]))
    updateRow(row.key, {
      subjectId,
      ...(subject &&
        unmarked && {
          theoryMarks: String(subject.fullMarks),
          theoryPassMarks: String(subject.passMarks),
        }),
    })
  }

  function validate() {
    const next: Errors = {}
    if (!classId) next.classId = "Class is required."
    if (!yearId) next.yearId = "Academic year is required."
    if (institute.enableMedium && !medium) next.medium = "Medium is required."
    const duplicate = classYearSubjectStore
      .getList(institute.id)
      .some(
        (set) =>
          set.id !== existing?.id &&
          String(set.classId) === classId &&
          String(set.yearId) === yearId &&
          set.medium === (institute.enableMedium ? medium : "")
      )
    if (duplicate && !next.classId) {
      next.classId = "This class already has a subject set for this year and medium."
    }

    if (!rows.length) next.rows = "Add at least one subject."
    const seen = new Set<string>()
    rows.forEach((row, index) => {
      const at = (field: string) => `rows.${index}.${field}`
      // The same subject may appear once per group (or once for all groups).
      if (!row.subjectId) next[at("subjectId")] = "Pick a subject."
      else if (seen.has(`${row.subjectId}:${row.groupId}`)) {
        next[at("subjectId")] = "This subject is already listed for this group."
      }
      seen.add(`${row.subjectId}:${row.groupId}`)
      for (const key of numberKeys) {
        const value = num(row[key])
        if (Number.isNaN(value)) next[at(key)] = "Enter a number."
        else if (value < 0) next[at(key)] = "Can not be negative."
      }
      for (const part of markParts) {
        if (!next[at(part.pass)] && num(row[part.pass]) > num(row[part.marks])) {
          next[at(part.pass)] = `More than the ${part.label} marks.`
        }
      }
      if (!totals(row).totalMarks) next[at("total")] = "Give the subject some marks."
    })

    const count = Number(perStudent)
    if (!perStudent.trim()) next.perStudent = "Per student subject count is required."
    else if (!Number.isInteger(count) || count < 1) next.perStudent = "Enter a whole number of 1 or more."
    else if (count > rows.length) next.perStudent = `Can not exceed the ${rows.length} subjects listed.`
    return next
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.values(next).some(Boolean)) {
      toast.error("Check the highlighted fields.")
      return
    }

    const className = selectedClass?.name ?? "Class"
    const yearName = years.find((y) => String(y.id) === yearId)?.name ?? ""
    const input = {
      name: `${className} · ${yearName}`,
      status,
      medium: institute.enableMedium ? medium : "",
      classId: Number(classId),
      yearId: Number(yearId),
      perStudentSubjectCount: Number(perStudent),
      details: rows.map((row): ClassYearSubjectDetail => ({
        subjectId: Number(row.subjectId),
        subjectType: row.subjectType,
        groupId:
          row.groupId && classGroups.some((g) => String(g.id) === row.groupId)
            ? Number(row.groupId)
            : null,
        isAcceptPartial: row.isAcceptPartial,
        ...(Object.fromEntries(numberKeys.map((key) => [key, num(row[key])])) as Record<
          NumberKey,
          number
        >),
        ...totals(row),
      })),
    }
    if (existing) classYearSubjectStore.update(existing.id, input)
    else classYearSubjectStore.add({ ...input, instituteId: institute.id })
    toast.success(`${input.name} ${existing ? "updated" : "added"}`)
    router.push(listHref)
  }

  const classOptions = active(classes, classId).map((c) => ({
    value: String(c.id),
    label: c.medium ? `${c.name} (${c.medium})` : c.name,
  }))
  const yearOptions = active(years, yearId).map((y) => ({
    value: String(y.id),
    label: y.isCurrent ? `${y.name} (current)` : y.name,
  }))

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={listHref}>
          <ArrowLeftIcon data-icon="inline-start" />
          {plural}
        </Link>
      </Button>

      <h3 className="text-xl font-semibold tracking-tight">
        {existing ? `Edit ${lower}` : `Add ${lower}`}
      </h3>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Class and year</CardTitle>
          <CardDescription>
            One subject set per class, academic year and medium.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {institute.enableMedium && (
            <PickField
              id="medium"
              label="Medium"
              value={medium}
              onChange={setMedium}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              error={errors.medium}
            />
          )}
          <PickField
            id="classId"
            label="Class"
            value={classId}
            onChange={setClassId}
            options={classOptions}
            placeholder="Select class"
            error={errors.classId}
          />
          <PickField
            id="yearId"
            label="Academic year"
            value={yearId}
            onChange={setYearId}
            options={yearOptions}
            placeholder="Select academic year"
            error={errors.yearId}
          />
          <Field data-invalid={!!errors.perStudent}>
            <FieldLabel htmlFor="perStudent">Per student subject count</FieldLabel>
            <Input
              id="perStudent"
              type="number"
              min={1}
              step={1}
              value={perStudent}
              aria-invalid={!!errors.perStudent}
              onChange={(event) => setPerStudent(event.target.value)}
            />
            <FieldDescription>How many of these subjects each student takes.</FieldDescription>
            <FieldError>{errors.perStudent}</FieldError>
          </Field>
          <SelectField
            name="status"
            label="Status"
            options={recordStatuses}
            value={status}
            onChange={setStatus}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h4 className="font-semibold">Subjects</h4>
          <p className="text-sm text-muted-foreground">
            {rows.length} subject{rows.length === 1 ? "" : "s"}. Totals are the sum of the
            parts.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRows((current) => [...current, toRow()])}
        >
          <PlusIcon data-icon="inline-start" />
          Add subject
        </Button>
      </div>
      {errors.rows && <p className="text-sm text-destructive">{errors.rows}</p>}

      {rows.map((row, index) => {
        const at = (field: string) => errors[`rows.${index}.${field}`]
        const { totalMarks, totalPassMarks } = totals(row)
        return (
          <Card key={row.key}>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]">
                <PickField
                  id={`subject-${row.key}`}
                  label={`Subject ${index + 1}`}
                  value={row.subjectId}
                  onChange={(value) => pickSubject(row, value)}
                  options={active(subjects, row.subjectId).map((s) => ({
                    value: String(s.id),
                    label: `${s.name} (${s.code})`,
                  }))}
                  placeholder="Select subject"
                  error={at("subjectId")}
                />
                <PickField
                  id={`type-${row.key}`}
                  label="Subject type"
                  value={row.subjectType}
                  onChange={(value) =>
                    updateRow(row.key, { subjectType: value as Row["subjectType"] })
                  }
                  options={subjectTypes.map((t) => ({ value: t, label: t }))}
                />
                {classGroups.length > 0 ? (
                  <PickField
                    id={`group-${row.key}`}
                    label="Subject group"
                    value={row.groupId}
                    onChange={(value) => updateRow(row.key, { groupId: value })}
                    options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
                    noneLabel="All groups"
                  />
                ) : (
                  <div className="hidden lg:block" />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="self-end text-muted-foreground"
                  disabled={rows.length === 1}
                  onClick={() =>
                    setRows((current) => current.filter((r) => r.key !== row.key))
                  }
                >
                  <Trash2Icon />
                  <span className="sr-only">Remove subject</span>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {markParts.map((part) => (
                  <fieldset key={part.label} className="flex flex-col gap-2 rounded-md border p-3">
                    <legend className="px-1 text-xs font-medium text-muted-foreground">
                      {part.label}
                    </legend>
                    <NumberInput
                      label="Marks"
                      value={row[part.marks]}
                      error={at(part.marks)}
                      onChange={(value) => updateRow(row.key, { [part.marks]: value })}
                    />
                    <NumberInput
                      label="Pass"
                      value={row[part.pass]}
                      error={at(part.pass)}
                      onChange={(value) => updateRow(row.key, { [part.pass]: value })}
                    />
                  </fieldset>
                ))}
                <fieldset
                  className={cn(
                    "flex flex-col justify-center gap-1 rounded-md border bg-muted/50 p-3",
                    at("total") && "border-destructive"
                  )}
                >
                  <legend className="px-1 text-xs font-medium text-muted-foreground">
                    Total
                  </legend>
                  <span className="text-lg font-semibold tabular-nums">
                    {Number.isNaN(totalMarks) ? "—" : totalMarks}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Pass {Number.isNaN(totalPassMarks) ? "—" : totalPassMarks}
                  </span>
                  {at("total") && (
                    <span className="text-xs text-destructive">{at("total")}</span>
                  )}
                </fieldset>
              </div>

              <div className="flex flex-wrap items-end gap-4">
                {mcqFields.map((field) => (
                  <div key={field.key} className="w-44">
                    <NumberInput
                      label={field.label}
                      value={row[field.key]}
                      error={at(field.key)}
                      onChange={(value) => updateRow(row.key, { [field.key]: value })}
                    />
                  </div>
                ))}
                <Field orientation="horizontal" className="w-fit pb-2">
                  <Checkbox
                    id={`partial-${row.key}`}
                    checked={row.isAcceptPartial}
                    onCheckedChange={(checked) =>
                      updateRow(row.key, { isAcceptPartial: checked === true })
                    }
                  />
                  <FieldLabel htmlFor={`partial-${row.key}`} className="font-normal">
                    Accept partial
                  </FieldLabel>
                </Field>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background px-4 py-3 lg:-mx-6 lg:px-6">
        <Button asChild variant="outline">
          <Link href={listHref}>Cancel</Link>
        </Button>
        <Button type="submit">{existing ? "Save changes" : `Add ${lower}`}</Button>
      </div>
    </form>
  )
}

export function PickField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  noneLabel,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  // Offers a blank choice with this label.
  noneLabel?: string
  error?: string
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={value === "" && noneLabel ? NONE : value}
        onValueChange={(next) => onChange(next === NONE ? "" : next)}
      >
        <SelectTrigger id={id} className="w-full" aria-invalid={!!error}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {noneLabel && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function NumberInput({
  label,
  value,
  error,
  onChange,
}: {
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <Field data-invalid={!!error} className="gap-1">
      <FieldLabel className="text-xs font-normal text-muted-foreground">{label}</FieldLabel>
      <Input
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        value={value}
        aria-label={label}
        aria-invalid={!!error}
        onChange={(event) => onChange(event.target.value)}
        className="h-8"
      />
      <FieldError className="text-xs">{error}</FieldError>
    </Field>
  )
}
