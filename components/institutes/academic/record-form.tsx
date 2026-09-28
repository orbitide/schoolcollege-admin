"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"
import { toast } from "sonner"

import {
  isKindEnabled,
  kindConfig,
  kindLabels,
  visibleFields,
  type AcademicKind,
  type EditableRecord,
  type Errors,
  type FieldDef,
  type FieldValue,
  type FieldValues,
  type FormState,
} from "@/components/institutes/academic/kinds"
import { BuildingForm } from "@/components/institutes/academic/building-form"
import { ClassYearSubjectForm } from "@/components/institutes/academic/class-year-subject-form"
import { DashboardMenuForm } from "@/components/configurations/dashboard-menu-form"
import { NotFound } from "@/components/institutes/academic/record-list"
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { RecordStore } from "@/lib/academic-store"
import {
  recordStatuses,
  type Institute,
  editableStatus,
  type RecordStatus,
} from "@/lib/institutes"
import { useCurrentUser } from "@/lib/current-user"
import { useInstitute } from "@/lib/institutes-store"
import { cn } from "@/lib/utils"

// Radix Select can't use "" as a value, so optional selects map "" to this.
const ALL = "__all"

// Where Back, Cancel and Save lead: the institute's list, or the
// all-institutes admin list the form was opened from (`?returnTo=`).
function useListHref(instituteId: number, segment: string) {
  const returnTo = useSearchParams().get("returnTo")
  return returnTo?.startsWith("/basic-settings/") || returnTo?.startsWith("/configurations/")
    ? returnTo
    : `/institutes/${instituteId}/${segment}`
}

export function RecordForm({
  instituteId,
  kind,
  recordId,
}: {
  instituteId: number
  kind: AcademicKind
  recordId?: number
}) {
  const config = kindConfig(kind)
  const institute = useInstitute(instituteId)
  const record = config.store.useOne(recordId ?? -1)
  const listHref = useListHref(instituteId, config.segment)
  // Legacy Copy (`?copy=` on the new page): a new record started from this one.
  const copyId = Number(useSearchParams().get("copy")) || undefined
  const copied = config.store.useOne(copyId ?? -1)
  const copyFrom =
    recordId === undefined && copied?.instituteId === instituteId && copied.status !== "Deleted"
      ? copied
      : undefined

  if (!institute) return <NotFound />
  const { singular, plural } = kindLabels(kind, institute)
  if (
    recordId !== undefined &&
    (!record || record.instituteId !== instituteId || record.status === "Deleted")
  ) {
    return <NotFound what={singular} />
  }

  if (!isKindEnabled(kind, institute)) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          {plural} are turned off for this institute.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>Back to {plural.toLowerCase()}</Link>
        </Button>
      </div>
    )
  }

  if (kind === "classSubjects") {
    return (
      <ClassYearSubjectForm
        key={recordId ?? `copy-${copyFrom?.id ?? "new"}`}
        institute={institute}
        record={record}
        copyFrom={copyFrom}
        singular={singular}
        plural={plural}
        listHref={listHref}
      />
    )
  }

  if (config.customForm) {
    const CustomForm =
      kind === "buildings"
        ? BuildingForm
        : DashboardMenuForm
    return (
      <CustomForm
        key={recordId ?? "new"}
        institute={institute}
        record={record}
        singular={singular}
        plural={plural}
        listHref={listHref}
      />
    )
  }

  return (
    <RecordFormBody
      key={recordId ?? "new"}
      institute={institute}
      kind={kind}
      singular={singular}
      plural={plural}
      record={record}
    />
  )
}

function initialValue(field: FieldDef, record?: EditableRecord) {
  const value = record?.[field.key]
  switch (field.type) {
    case "checkbox":
      return Boolean(value)
    case "integer":
    case "decimal":
      return String(value ?? 0)
    case "select":
      return String(value ?? (field.required ? field.options?.[0] ?? "" : ""))
    case "multiselect":
      return Array.isArray(value) ? value.map(String) : []
    default:
      return String(value ?? "")
  }
}

function blankValue(field: FieldDef): FieldValue {
  if (field.type === "record") return null
  if (field.type === "multiselect") return []
  if (field.type === "integer" || field.type === "decimal") return 0
  return ""
}

function RecordFormBody({
  institute,
  kind,
  singular,
  plural,
  record,
}: {
  institute: Institute
  kind: AcademicKind
  singular: string
  plural: string
  record?: EditableRecord
}) {
  const config = kindConfig(kind)
  const router = useRouter()
  const user = useCurrentUser()
  const siblings = config.store
    .useList(institute.id)
    .filter((sibling) => sibling.id !== record?.id)
  const [name, setName] = React.useState(record?.name ?? "")
  const [status, setStatus] = React.useState<RecordStatus>(
    editableStatus(record?.status)
  )
  const [values, setValues] = React.useState<FormState>(() =>
    Object.fromEntries(config.fields.map((f) => [f.key, initialValue(f, record)]))
  )
  const [errors, setErrors] = React.useState<Errors>({})
  // Fields the institute uses, then those the other inputs currently allow.
  const institutionFields = visibleFields(kind, institute)
  const fields = institutionFields.filter(
    (field) => !field.showWhenValues || field.showWhenValues(values)
  )
  const listHref = useListHref(institute.id, config.segment)
  const lower = singular.toLowerCase()

  function set(key: string, value: string | boolean | string[]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  // Parse and check every field; returns typed values plus any errors.
  function parse(): { parsed: FieldValues; next: Errors } {
    const parsed: FieldValues = {}
    const next: Errors = {}

    for (const field of config.fields) {
      const raw = values[field.key]
      if (field.type === "checkbox") {
        parsed[field.key] = Boolean(raw)
        continue
      }
      // Fields the institute has turned off keep whatever the record had.
      if (!institutionFields.includes(field)) {
        parsed[field.key] = record
          ? ((record[field.key] ?? null) as FieldValue)
          : (field.fallback ?? blankValue(field))
        continue
      }
      // Fields hidden by another input (e.g. groups without "Has subject
      // group") are cleared.
      if (!fields.includes(field)) {
        parsed[field.key] = field.fallback ?? blankValue(field)
        continue
      }
      if (field.type === "multiselect") {
        const picked = Array.isArray(raw) ? raw : []
        parsed[field.key] = field.source ? picked.map(Number) : picked
        if (field.required && !picked.length) {
          next[field.key] = `Pick at least one ${field.label.toLowerCase()}.`
        }
        continue
      }
      const text = String(raw ?? "").trim()
      if (field.type === "record") {
        parsed[field.key] = text === "" ? null : Number(text)
        if (text === "" && field.required) next[field.key] = `${field.label} is required.`
        const picked = text && field.source?.getList(institute.id).find((r) => String(r.id) === text)
        if (picked && field.sourceFilter && !field.sourceFilter(picked, values)) {
          next[field.key] = `This ${field.label.toLowerCase()} doesn't fit the other choices.`
        }
        continue
      }
      if (field.type === "integer" || field.type === "decimal") {
        const number = Number(text)
        parsed[field.key] = text === "" ? 0 : number
        if (text === "" && field.required) next[field.key] = `${field.label} is required.`
        else if (Number.isNaN(number)) next[field.key] = "Enter a number."
        else if (field.type === "integer" && !Number.isInteger(number)) {
          next[field.key] = "Enter a whole number."
        } else if (field.min !== undefined && number < field.min) {
          next[field.key] = `Must be ${field.min} or more.`
        } else if (field.max !== undefined && number > field.max) {
          next[field.key] = `Must be ${field.max} or less.`
        }
        continue
      }
      parsed[field.key] = text
      if (field.required && !text) {
        next[field.key] = `${field.label} is required.`
      }
    }

    const scope = Object.fromEntries(
      (config.uniqueScope ?? []).map((key) => [key, parsed[key]])
    )
    const trimmedName = name.trim()
    const nameLabel = config.nameLabel ?? "Name"
    if (!trimmedName) {
      next.name = `${nameLabel} is required.`
    } else if (
      config.store.isTaken(institute.id, "name", trimmedName, record?.id, scope)
    ) {
      next.name = `Another ${lower} already uses this ${nameLabel.toLowerCase()}.`
    }
    for (const field of config.fields) {
      if (
        field.unique &&
        !next[field.key] &&
        config.store.isTaken(
          institute.id,
          field.key,
          String(parsed[field.key]),
          record?.id,
          scope
        )
      ) {
        next[field.key] = `Another ${lower} already uses this ${field.label.toLowerCase()}.`
      }
    }

    if (Object.values(next).every((error) => !error) && config.validate) {
      Object.assign(next, config.validate(parsed, { institute, siblings, record }))
    }
    return { parsed, next }
  }

  // Legacy "Save And New" (kinds with `softDelete`) stays on a blank form.
  function save(andNew: boolean) {
    const { parsed, next } = parse()
    setErrors(next)
    if (Object.values(next).some(Boolean)) return

    const currentField = config.fields.find((field) => field.current)
    const input: Partial<EditableRecord> = {
      ...parsed,
      name: name.trim(),
      status,
      // The current flag is only ever set through setCurrent below.
      ...(currentField && { [currentField.key]: Boolean(record?.[currentField.key]) }),
    }

    const id = record
      ? (config.store.update(record.id, input, user.name), record.id)
      : config.store.add({ ...input, instituteId: institute.id } as EditableRecord, user.name).id
    if (currentField && parsed[currentField.key] && !record?.[currentField.key]) {
      config.store.setCurrent(id)
    }
    toast.success(`${name.trim()} ${record ? "updated" : "added"}`)
    if (andNew) {
      setName("")
      setValues(Object.fromEntries(config.fields.map((f) => [f.key, initialValue(f)])))
      setErrors({})
    } else {
      router.push(listHref)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    save(false)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={listHref}>
          <ArrowLeftIcon data-icon="inline-start" />
          {plural}
        </Link>
      </Button>

      <h3 className="text-xl font-semibold tracking-tight">
        {record ? `Edit ${lower}` : `Add ${lower}`}
      </h3>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{singular} details</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            data-invalid={!!errors.name}
            className={config.nameMultiline ? "sm:col-span-2" : undefined}
          >
            <FieldLabel htmlFor="name">{config.nameLabel ?? "Name"}</FieldLabel>
            {config.nameMultiline ? (
              <Textarea
                id="name"
                value={name}
                aria-invalid={!!errors.name}
                onChange={(event) => setName(event.target.value)}
              />
            ) : (
              <Input
                id="name"
                value={name}
                aria-invalid={!!errors.name}
                onChange={(event) => setName(event.target.value)}
              />
            )}
            <FieldError>{errors.name}</FieldError>
          </Field>
          {/* Legacy grids change status from the list, not the form. */}
          {!config.softDelete && (
            <SelectField
              name="status"
              label="Status"
              options={recordStatuses}
              value={status}
              onChange={setStatus}
            />
          )}
          {fields.map((field) => (
            <RecordField
              key={field.key}
              field={field}
              value={values[field.key]}
              values={values}
              error={errors[field.key]}
              institute={institute}
              locked={field.current && Boolean(record?.[field.key])}
              lower={lower}
              onChange={(value) => set(field.key, value)}
              // A record can't point at itself, e.g. as its own previous class.
              excludeId={field.source === config.store ? record?.id : undefined}
            />
          ))}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background px-4 py-3 lg:-mx-6 lg:px-6">
        <Button asChild variant="outline">
          <Link href={listHref}>Cancel</Link>
        </Button>
        {config.softDelete && !record && (
          <Button type="button" variant="secondary" onClick={() => save(true)}>
            Save and new
          </Button>
        )}
        <Button type="submit">{record ? "Save changes" : `Add ${lower}`}</Button>
      </div>
    </form>
  )
}

function RecordField({
  field,
  value,
  values,
  error,
  institute,
  locked,
  lower,
  onChange,
  excludeId,
}: {
  field: FieldDef
  value: string | boolean | string[]
  // Every input of the form, for fields whose options depend on others.
  values: FormState
  error?: string
  institute: Institute
  locked?: boolean
  lower: string
  onChange: (value: string | boolean | string[]) => void
  excludeId?: number
}) {
  const id = field.key
  const wide = field.wide || field.type === "textarea" || field.type === "checkbox"
  const hint = field.hint?.(value as FieldValue, institute)

  if (field.type === "checkbox") {
    const description = field.current
      ? locked
        ? `This is the current ${lower}. Set another one as current to change it.`
        : `Replaces the institute's current ${lower}.`
      : field.description
    return (
      <Field orientation="horizontal" className="sm:col-span-2">
        <Checkbox
          id={id}
          checked={Boolean(value)}
          disabled={locked}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
        <FieldContent>
          <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
          {description && <FieldDescription>{description}</FieldDescription>}
        </FieldContent>
      </Field>
    )
  }

  if (field.type === "multiselect") {
    const picked = Array.isArray(value) ? value : []
    return (
      <Field data-invalid={!!error} className="sm:col-span-2">
        <FieldLabel>{field.label}</FieldLabel>
        {field.source ? (
          <RecordCheckboxes
            id={id}
            source={field.source}
            instituteId={institute.id}
            picked={picked}
            onChange={onChange}
          />
        ) : (
          <Checkboxes
            id={id}
            options={(field.options ?? []).map((option) => ({
              value: option,
              label: option,
            }))}
            picked={picked}
            onChange={onChange}
          />
        )}
        {field.description && <FieldDescription>{field.description}</FieldDescription>}
        <FieldError>{error}</FieldError>
      </Field>
    )
  }

  let control: React.ReactNode
  if (field.type === "record" && field.source) {
    control = (
      <RecordSelect
        id={id}
        field={field}
        source={field.source}
        instituteId={institute.id}
        value={String(value)}
        values={values}
        invalid={!!error}
        excludeId={excludeId}
        onChange={onChange}
      />
    )
  } else if (field.type === "select") {
    const options = field.options ?? []
    control = (
      <Select
        value={value === "" ? ALL : String(value)}
        onValueChange={(next) => onChange(next === ALL ? "" : next)}
      >
        <SelectTrigger id={id} className="w-full" aria-invalid={!!error}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {!field.required && (
              <SelectItem value={ALL}>{field.allLabel ?? "None"}</SelectItem>
            )}
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    )
  } else if (field.type === "textarea") {
    control = (
      <Textarea
        id={id}
        rows={3}
        value={String(value)}
        aria-invalid={!!error}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  } else {
    const numeric = field.type === "integer" || field.type === "decimal"
    control = (
      <Input
        id={id}
        type={numeric ? "number" : field.type === "date" ? "date" : "text"}
        step={field.type === "decimal" ? "0.01" : numeric ? "1" : undefined}
        min={field.min}
        max={field.max}
        placeholder={field.placeholder}
        value={String(value)}
        aria-invalid={!!error}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  return (
    <Field data-invalid={!!error} className={cn(wide && "sm:col-span-2")}>
      <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
      {control}
      {(hint || field.description) && (
        <FieldDescription>{hint ?? field.description}</FieldDescription>
      )}
      <FieldError>{error}</FieldError>
    </Field>
  )
}

// Picks another record of the institute (e.g. a section's class) by id.
// Inactive records are left out unless this record already points at one.
function RecordSelect({
  id,
  field,
  source,
  instituteId,
  value,
  values,
  invalid,
  excludeId,
  onChange,
}: {
  id: string
  field: FieldDef
  source: RecordStore<EditableRecord>
  instituteId: number
  value: string
  values: FormState
  invalid: boolean
  excludeId?: number
  onChange: (value: string) => void
}) {
  const options = source
    .useList(instituteId)
    .filter((record) => record.status === "Active" || String(record.id) === value)
    .filter((record) => record.id !== excludeId)
    .filter(
      (record) =>
        !field.sourceFilter || field.sourceFilter(record, values) || String(record.id) === value
    )

  if (!options.length && field.required) {
    return (
      <p className="text-sm text-muted-foreground">
        No active {field.label.toLowerCase()} records yet. Add one first.
      </p>
    )
  }

  return (
    <Select
      value={value === "" ? (field.required ? "" : ALL) : value}
      onValueChange={(next) => onChange(next === ALL ? "" : next)}
    >
      <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
        <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {!field.required && (
            <SelectItem value={ALL}>{field.allLabel ?? "None"}</SelectItem>
          )}
          {options.map((record) => (
            <SelectItem key={record.id} value={String(record.id)}>
              {record.name}
              {record.status !== "Active" && " (inactive)"}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

type CheckboxOption = { value: string; label: string }

// A grid of checkboxes whose value is the list of ticked option values.
function Checkboxes({
  id,
  options,
  picked,
  onChange,
}: {
  id: string
  options: CheckboxOption[]
  picked: string[]
  onChange: (value: string[]) => void
}) {
  function toggle(value: string, checked: boolean) {
    // Keep the options' order rather than the order they were ticked in.
    const next = new Set(picked)
    if (checked) next.add(value)
    else next.delete(value)
    onChange(options.map((o) => o.value).filter((v) => next.has(v)))
  }

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((option) => {
        const optionId = `${id}-${option.value}`
        return (
          <Field key={option.value} orientation="horizontal">
            <Checkbox
              id={optionId}
              checked={picked.includes(option.value)}
              onCheckedChange={(checked) => toggle(option.value, checked === true)}
            />
            <FieldLabel htmlFor={optionId} className="font-normal">
              {option.label}
            </FieldLabel>
          </Field>
        )
      })}
    </div>
  )
}

// Checkboxes for the institute's records (e.g. a class's subject groups).
function RecordCheckboxes({
  id,
  source,
  instituteId,
  picked,
  onChange,
}: {
  id: string
  source: RecordStore<EditableRecord>
  instituteId: number
  picked: string[]
  onChange: (value: string[]) => void
}) {
  const options = source
    .useList(instituteId)
    .filter((record) => record.status === "Active" || picked.includes(String(record.id)))
    .map((record) => ({ value: String(record.id), label: record.name }))

  if (!options.length) {
    return <p className="text-sm text-muted-foreground">Nothing to pick yet. Add some first.</p>
  }
  return <Checkboxes id={id} options={options} picked={picked} onChange={onChange} />
}
