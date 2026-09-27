"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
} from "@/components/institutes/academic/kinds"
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
import {
  recordStatuses,
  type Institute,
  type RecordStatus,
} from "@/lib/institutes"
import { useInstitute } from "@/lib/institutes-store"
import { cn } from "@/lib/utils"

// Radix Select can't use "" as a value, so optional selects map "" to this.
const ALL = "__all"

// Form state keeps inputs as strings (and checkboxes as booleans) until submit.
type FormState = Record<string, string | boolean>

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

  if (!institute) return <NotFound />
  const { singular, plural } = kindLabels(kind, institute)
  if (
    recordId !== undefined &&
    (!record || record.instituteId !== instituteId)
  ) {
    return <NotFound what={singular} />
  }

  const listHref = `/institutes/${instituteId}/${config.segment}`
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
    default:
      return String(value ?? "")
  }
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
  const siblings = config.store
    .useList(institute.id)
    .filter((sibling) => sibling.id !== record?.id)
  const fields = visibleFields(kind, institute)
  const [name, setName] = React.useState(record?.name ?? "")
  const [status, setStatus] = React.useState<RecordStatus>(
    record?.status ?? "Active"
  )
  const [values, setValues] = React.useState<FormState>(() =>
    Object.fromEntries(config.fields.map((f) => [f.key, initialValue(f, record)]))
  )
  const [errors, setErrors] = React.useState<Errors>({})
  const listHref = `/institutes/${institute.id}/${config.segment}`
  const lower = singular.toLowerCase()

  function set(key: string, value: string | boolean) {
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
      const text = String(raw ?? "").trim()
      const shown = fields.includes(field)
      if (field.type === "integer" || field.type === "decimal") {
        const number = Number(text)
        parsed[field.key] = text === "" ? 0 : number
        if (!shown) continue
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
      if (shown && field.required && !text) {
        next[field.key] = `${field.label} is required.`
      }
    }

    const scope = Object.fromEntries(
      (config.uniqueScope ?? []).map((key) => [key, parsed[key]])
    )
    const trimmedName = name.trim()
    if (!trimmedName) {
      next.name = "Name is required."
    } else if (
      config.store.isTaken(institute.id, "name", trimmedName, record?.id, scope)
    ) {
      next.name = `Another ${lower} already uses this name.`
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
      Object.assign(next, config.validate(parsed, { institute, siblings }))
    }
    return { parsed, next }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
      ? (config.store.update(record.id, input), record.id)
      : config.store.add({ ...input, instituteId: institute.id } as EditableRecord).id
    if (currentField && parsed[currentField.key] && !record?.[currentField.key]) {
      config.store.setCurrent(id)
    }
    toast.success(`${name.trim()} ${record ? "updated" : "added"}`)
    router.push(listHref)
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
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              value={name}
              aria-invalid={!!errors.name}
              onChange={(event) => setName(event.target.value)}
            />
            <FieldError>{errors.name}</FieldError>
          </Field>
          <SelectField
            name="status"
            label="Status"
            options={recordStatuses}
            value={status}
            onChange={setStatus}
          />
          {fields.map((field) => (
            <RecordField
              key={field.key}
              field={field}
              value={values[field.key]}
              error={errors[field.key]}
              institute={institute}
              locked={field.current && Boolean(record?.[field.key])}
              lower={lower}
              onChange={(value) => set(field.key, value)}
            />
          ))}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background px-4 py-3 lg:-mx-6 lg:px-6">
        <Button asChild variant="outline">
          <Link href={listHref}>Cancel</Link>
        </Button>
        <Button type="submit">{record ? "Save changes" : `Add ${lower}`}</Button>
      </div>
    </form>
  )
}

function RecordField({
  field,
  value,
  error,
  institute,
  locked,
  lower,
  onChange,
}: {
  field: FieldDef
  value: string | boolean
  error?: string
  institute: Institute
  locked?: boolean
  lower: string
  onChange: (value: string | boolean) => void
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

  let control: React.ReactNode
  if (field.type === "select") {
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
