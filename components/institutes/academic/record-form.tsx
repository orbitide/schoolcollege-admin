"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"
import { toast } from "sonner"

import {
  academicKinds,
  type AcademicKind,
  type EditableRecord,
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { recordStatuses, type RecordStatus } from "@/lib/institutes"
import { useInstitute } from "@/lib/institutes-store"

type Values = { name: string; code: string; address: string; status: RecordStatus }
type Errors = Partial<Record<keyof Values, string>>

export function RecordForm({
  instituteId,
  kind,
  recordId,
}: {
  instituteId: number
  kind: AcademicKind
  recordId?: number
}) {
  const config = academicKinds[kind]
  const institute = useInstitute(instituteId)
  const record = config.store.useOne(recordId ?? -1)

  if (!institute) return <NotFound />
  if (
    recordId !== undefined &&
    (!record || record.instituteId !== instituteId)
  ) {
    return <NotFound what={config.singular} />
  }

  return (
    <RecordFormBody
      key={recordId ?? "new"}
      instituteId={instituteId}
      instituteName={institute.name}
      kind={kind}
      record={record}
    />
  )
}

function RecordFormBody({
  instituteId,
  instituteName,
  kind,
  record,
}: {
  instituteId: number
  instituteName: string
  kind: AcademicKind
  record?: EditableRecord
}) {
  const config = academicKinds[kind]
  const router = useRouter()
  const [values, setValues] = React.useState<Values>({
    name: record?.name ?? "",
    code: record?.code ?? "",
    address: record?.address ?? "",
    status: record?.status ?? "Active",
  })
  const [errors, setErrors] = React.useState<Errors>({})
  const listHref = `/institutes/${instituteId}/${config.segment}`
  const singular = config.singular.toLowerCase()

  function text(key: "name" | "code" | "address") {
    return {
      id: key,
      name: key,
      value: values[key],
      "aria-invalid": !!errors[key],
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => setValues((current) => ({ ...current, [key]: event.target.value })),
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = {
      name: values.name.trim(),
      status: values.status,
      ...(config.hasCodeAndAddress && {
        code: values.code.trim(),
        address: values.address.trim(),
      }),
    }

    const next: Errors = {}
    if (!input.name) {
      next.name = `${config.singular} name is required.`
    } else if (config.store.isTaken(instituteId, "name", input.name, record?.id)) {
      next.name = `Another ${singular} already uses this name.`
    }
    if (config.hasCodeAndAddress) {
      if (!input.code) {
        next.code = "Code is required."
      } else if (config.store.isTaken(instituteId, "code", input.code, record?.id)) {
        next.code = `Another ${singular} already uses this code.`
      }
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    if (record) {
      config.store.update(record.id, input)
      toast.success(`${input.name} updated`)
    } else {
      config.store.add({ ...input, instituteId })
      toast.success(`${input.name} added`)
    }
    router.push(listHref)
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6"
    >
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={listHref}>
          <ArrowLeftIcon data-icon="inline-start" />
          {config.plural}
        </Link>
      </Button>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {record ? `Edit ${singular}` : `Add ${singular}`}
        </h2>
        <p className="text-sm text-muted-foreground">{instituteName}</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{config.singular} details</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input {...text("name")} />
            <FieldError>{errors.name}</FieldError>
          </Field>
          {config.hasCodeAndAddress && (
            <Field data-invalid={!!errors.code}>
              <FieldLabel htmlFor="code">Code</FieldLabel>
              <Input {...text("code")} />
              <FieldError>{errors.code}</FieldError>
            </Field>
          )}
          <SelectField
            name="status"
            label="Status"
            options={recordStatuses}
            value={values.status}
            onChange={(status) => setValues((current) => ({ ...current, status }))}
          />
          {config.hasCodeAndAddress && (
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="address">Address</FieldLabel>
              <Textarea rows={2} {...text("address")} />
            </Field>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background px-4 py-3 lg:-mx-6 lg:px-6">
        <Button asChild variant="outline">
          <Link href={listHref}>Cancel</Link>
        </Button>
        <Button type="submit">{record ? "Save changes" : `Add ${singular}`}</Button>
      </div>
    </form>
  )
}
