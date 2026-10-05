"use client"

import * as React from "react"

import type { LookupErrors, LookupFields, LookupPage } from "@/components/basic-settings/lookup/lookup-page"
import { createDataTableColumns } from "@/components/data-table/data-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { classStore } from "@/lib/academic-store"
import { branchApi, type BranchRow } from "@/lib/branches-store"
import { categoryApi } from "@/lib/categories-store"
import { houseApi, mediumLabels, type AcademicMedium, type HouseRow } from "@/lib/houses-store"
import type { LookupRow } from "@/lib/lookup-store"
import { remarkApi, type RemarkRow } from "@/lib/remarks-store"
import { sessionApi } from "@/lib/sessions-store"
import { shiftApi } from "@/lib/shifts-store"
import { yearApi, type YearRow } from "@/lib/years-store"

// The Basic Settings lookups on the API; the shared list, details and form
// pages under /basic-settings/<segment> take one of these keys.

function define<R extends LookupRow>(page: LookupPage<R>) {
  return page as unknown as LookupPage
}

// A text input the form keeps in state, with its error under it.
function useText(initial: string) {
  const [value, setValue] = React.useState(initial)
  return { value, setValue }
}

function TextField({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} value={value} aria-invalid={!!error} onChange={(event) => onChange(event.target.value)} />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

const noFields: LookupFields = { validate: () => ({}), values: () => ({}), reset: () => {}, render: () => null }

const branchColumn = createDataTableColumns<BranchRow>()
const yearColumn = createDataTableColumns<YearRow>()
const houseColumn = createDataTableColumns<HouseRow>()
const remarkColumn = createDataTableColumns<RemarkRow>()

const ALL = "all"

// Academic classes are still kept in memory, so their names come from there.
function useClassName(id: number | null) {
  const academicClass = classStore.useOne(id ?? -1)
  return id == null ? "All" : (academicClass?.name ?? "—")
}

function ClassName({ id }: { id: number | null }) {
  return useClassName(id)
}

// A record's class on its edit form, where it can't change.
function ClassNameInput({ id }: { id: number | null }) {
  return <Input id="academicClassId" value={useClassName(id)} disabled />
}

function OptionSelect({
  id,
  value,
  allLabel,
  options,
  onChange,
}: {
  id: string
  value: string
  allLabel: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <Select value={value || ALL} onValueChange={(next) => onChange(next === ALL ? "" : next)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

// The institute's classes, those of the picked medium when there is one (legacy LoadAcademicClass).
function ClassSelect({
  instituteId,
  medium,
  value,
  onChange,
}: {
  instituteId: number
  medium: string
  value: string
  onChange: (value: string) => void
}) {
  const label = medium ? mediumLabels[medium as AcademicMedium] : ""
  const classes = classStore
    .useList(instituteId)
    .filter((c) => c.status === "Active" || String(c.id) === value)
    .filter((c) => !label || !c.medium || c.medium === label || String(c.id) === value)
  return (
    <OptionSelect
      id="academicClassId"
      value={value}
      allLabel="All classes"
      options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
      onChange={onChange}
    />
  )
}

const range = (min: number, max: number, digits = 2) => `${min.toFixed(digits)}–${max.toFixed(digits)}`

// A decimal or whole-number input kept as text until saved.
function NumberField({
  id,
  label,
  value,
  error,
  decimal = true,
  onChange,
}: {
  id: string
  label: string
  value: string
  error?: string
  decimal?: boolean
  onChange: (value: string) => void
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        inputMode={decimal ? "decimal" : "numeric"}
        value={value}
        aria-invalid={!!error}
        onChange={(event) => onChange(event.target.value.replace(decimal ? /[^\d.]/g : /\D/g, ""))}
      />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

const isNumber = (text: string) => /^\d+(\.\d+)?$/.test(text.trim())

export const lookupPages = {
  remarks: define<RemarkRow>({
    store: remarkApi,
    segment: "remarks",
    singular: "Result Remarks",
    plural: "Result Remarks",
    description: "Remarks printed on results for a GPA or marks range and a fail-count range, per medium and class.",
    searchPlaceholder: "Search remarks",
    columns: [
      remarkColumn.accessor("minimumGpa", {
        header: "GPA",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="flex items-center gap-2 whitespace-nowrap">
            {row.original.isBasedOnGrading ? range(row.original.minimumGpa, row.original.maximumGpa) : "—"}
            {row.original.isGolden && <Badge className="bg-amber-500 text-white">Golden</Badge>}
          </span>
        ),
      }),
      remarkColumn.accessor("minimumMarks", {
        header: "Marks",
        enableSorting: true,
        cell: ({ row }) =>
          row.original.isBasedOnGrading ? "—" : range(row.original.minimumMarks, row.original.maximumMarks),
        meta: { className: "whitespace-nowrap" },
      }),
      remarkColumn.accessor("minimumFailCount", {
        header: "Fail count",
        enableSorting: true,
        cell: ({ row }) => range(row.original.minimumFailCount, row.original.maximumFailCount, 0),
      }),
      remarkColumn.accessor("academicMedium", {
        header: "Medium",
        enableSorting: true,
        cell: ({ row }) => (row.original.academicMedium ? mediumLabels[row.original.academicMedium] : "All"),
      }),
      remarkColumn.display({ id: "class", header: "Class", cell: ({ row }) => <ClassName id={row.original.academicClassId} /> }),
    ],
    details: (row) => [
      ["Medium", row.academicMedium ? mediumLabels[row.academicMedium] : "All"],
      ["Class", <ClassName key="class" id={row.academicClassId} />],
      ["Based on grading", row.isBasedOnGrading ? "Yes" : "No"],
      ["Golden", row.isGolden ? "Yes" : "No"],
      ...(row.isBasedOnGrading
        ? ([["GPA", range(row.minimumGpa, row.maximumGpa)]] as [string, React.ReactNode][])
        : ([["Marks", range(row.minimumMarks, row.maximumMarks)]] as [string, React.ReactNode][])),
      ["Fail count", range(row.minimumFailCount, row.maximumFailCount, 0)],
    ],
    form: {
      nameRequired: "Enter the remarks.",
      useFields: function useRemarkFields(row) {
        const [medium, setMedium] = React.useState<string>(row?.academicMedium ?? "")
        const [classId, setClassId] = React.useState(row?.academicClassId ? String(row.academicClassId) : "")
        const [grading, setGrading] = React.useState(row?.isBasedOnGrading ?? true)
        const [golden, setGolden] = React.useState(row?.isGolden ?? false)
        const minGpa = useText(String(row?.minimumGpa ?? 0))
        const maxGpa = useText(String(row?.maximumGpa ?? 0))
        const minMarks = useText(String(row?.minimumMarks ?? 0))
        const maxMarks = useText(String(row?.maximumMarks ?? 0))
        const minFail = useText(String(row?.minimumFailCount ?? 0))
        const maxFail = useText(String(row?.maximumFailCount ?? 0))

        function rangeErrors(min: string, max: string, label: string, limit?: number) {
          if (!isNumber(min) || !isNumber(max)) return `Enter the minimum and maximum ${label}.`
          if (Number(min) > Number(max)) return `Minimum ${label} won't exceed Maximum ${label}.`
          if (limit !== undefined && Number(max) > limit) return `Maximum ${label} can not exceed ${limit}.`
          return undefined
        }

        return {
          validate: (institute) => ({
            // Legacy asks for the class (and the medium where mediums are used) on create.
            academicMedium: !row && institute?.enableMedium && !medium ? "Select the medium." : undefined,
            academicClassId: !row && !classId ? "Select the class." : undefined,
            // The institute's maximum GPA (Institute Configurations) caps the range.
            minimumGpa: grading
              ? rangeErrors(minGpa.value, maxGpa.value, "GPA", institute?.configuration.maximumGpa)
              : undefined,
            minimumMarks: grading ? undefined : rangeErrors(minMarks.value, maxMarks.value, "mark", 100),
            minimumFailCount: rangeErrors(minFail.value, maxFail.value, "fail count"),
          }),
          values: () => ({
            academicMedium: medium || null,
            academicClassId: classId ? Number(classId) : null,
            isBasedOnGrading: grading,
            isGolden: golden,
            minimumGpa: grading ? Number(minGpa.value) : 0,
            maximumGpa: grading ? Number(maxGpa.value) : 0,
            minimumMarks: grading ? 0 : Number(minMarks.value),
            maximumMarks: grading ? 0 : Number(maxMarks.value),
            minimumFailCount: Number(minFail.value),
            maximumFailCount: Number(maxFail.value),
          }),
          reset: () => {
            for (const field of [minGpa, maxGpa, minMarks, maxMarks, minFail, maxFail]) field.setValue("0")
            setGolden(false)
          },
          render: (errors: LookupErrors, institute) => (
            <>
              {row ? (
                <>
                  <Field>
                    <FieldLabel htmlFor="academicMedium">Medium</FieldLabel>
                    <Input id="academicMedium" value={medium ? mediumLabels[medium as AcademicMedium] : "All"} disabled />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="academicClassId">Academic class</FieldLabel>
                    <ClassNameInput id={classId ? Number(classId) : null} />
                  </Field>
                </>
              ) : (
                institute && (
                  <>
                    {institute.enableMedium && (
                      <Field data-invalid={!!errors.academicMedium}>
                        <FieldLabel htmlFor="academicMedium">Medium</FieldLabel>
                        <OptionSelect
                          id="academicMedium"
                          value={medium}
                          allLabel="Select medium"
                          options={Object.entries(mediumLabels).map(([value, label]) => ({ value, label }))}
                          onChange={(next) => {
                            setMedium(next)
                            setClassId("")
                          }}
                        />
                        <FieldError>{errors.academicMedium}</FieldError>
                      </Field>
                    )}
                    <Field data-invalid={!!errors.academicClassId}>
                      <FieldLabel htmlFor="academicClassId">Academic class</FieldLabel>
                      <ClassSelect instituteId={institute.id} medium={medium} value={classId} onChange={setClassId} />
                      <FieldError>{errors.academicClassId}</FieldError>
                    </Field>
                  </>
                )
              )}
              <Field orientation="horizontal">
                <Checkbox id="isGolden" checked={golden} onCheckedChange={(checked) => setGolden(checked === true)} />
                <FieldLabel htmlFor="isGolden">Golden</FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <Checkbox id="isBasedOnGrading" checked={grading} onCheckedChange={(checked) => setGrading(checked === true)} />
                <FieldLabel htmlFor="isBasedOnGrading">Based on grading (GPA range instead of marks)</FieldLabel>
              </Field>
              {grading ? (
                <>
                  <NumberField id="minimumGpa" label="Minimum GPA" value={minGpa.value} error={errors.minimumGpa} onChange={minGpa.setValue} />
                  <NumberField id="maximumGpa" label="Maximum GPA" value={maxGpa.value} onChange={maxGpa.setValue} />
                </>
              ) : (
                <>
                  <NumberField id="minimumMarks" label="Minimum marks" value={minMarks.value} error={errors.minimumMarks} onChange={minMarks.setValue} />
                  <NumberField id="maximumMarks" label="Maximum marks" value={maxMarks.value} onChange={maxMarks.setValue} />
                </>
              )}
              <NumberField
                id="minimumFailCount"
                label="Minimum fail count"
                value={minFail.value}
                error={errors.minimumFailCount}
                decimal={false}
                onChange={minFail.setValue}
              />
              <NumberField id="maximumFailCount" label="Maximum fail count" value={maxFail.value} decimal={false} onChange={maxFail.setValue} />
            </>
          ),
        }
      },
    },
  }),

  houses: define<HouseRow>({
    store: houseApi,
    segment: "houses",
    singular: "Student House",
    plural: "Student Houses",
    description: "Student houses for the whole institute, or one medium and/or class; names and ranks are kept within that scope.",
    searchPlaceholder: "Search house name",
    columns: [
      houseColumn.accessor("academicMedium", {
        header: "Medium",
        enableSorting: true,
        cell: ({ row }) => (row.original.academicMedium ? mediumLabels[row.original.academicMedium] : "All"),
      }),
      houseColumn.display({ id: "class", header: "Class", cell: ({ row }) => <ClassName id={row.original.academicClassId} /> }),
      houseColumn.accessor("capacity", {
        header: "Capacity",
        enableSorting: true,
        cell: ({ row }) => (row.original.capacity ? row.original.capacity.toLocaleString() : "Unlimited"),
        meta: { className: "text-right tabular-nums", headerClassName: "text-right" },
      }),
    ],
    details: (row) => [
      ["Medium", row.academicMedium ? mediumLabels[row.academicMedium] : "All"],
      ["Class", <ClassName key="class" id={row.academicClassId} />],
      ["Capacity", row.capacity ? row.capacity.toLocaleString() : "Unlimited"],
    ],
    form: {
      nameRequired: "Insert StudentHouse Name.",
      useFields: function useHouseFields(row) {
        const [medium, setMedium] = React.useState<string>(row?.academicMedium ?? "")
        const [classId, setClassId] = React.useState(row?.academicClassId ? String(row.academicClassId) : "")
        const capacity = useText(String(row?.capacity ?? 0))
        return {
          validate: () => ({
            capacity: /^\d+$/.test(capacity.value.trim()) ? undefined : "Enter a whole number, 0 for no limit.",
          }),
          values: () => ({
            capacity: Number(capacity.value.trim()),
            academicMedium: medium || null,
            academicClassId: classId ? Number(classId) : null,
          }),
          reset: () => {
            capacity.setValue("0")
          },
          render: (errors: LookupErrors, institute) => (
            <>
              {institute?.enableMedium && (
                <Field>
                  <FieldLabel htmlFor="academicMedium">Medium</FieldLabel>
                  <OptionSelect
                    id="academicMedium"
                    value={medium}
                    allLabel="All mediums"
                    options={Object.entries(mediumLabels).map(([value, label]) => ({ value, label }))}
                    onChange={(next) => {
                      setMedium(next)
                      setClassId("")
                    }}
                  />
                </Field>
              )}
              {institute && (
                <Field>
                  <FieldLabel htmlFor="academicClassId">Academic class</FieldLabel>
                  <ClassSelect instituteId={institute.id} medium={medium} value={classId} onChange={setClassId} />
                </Field>
              )}
              <Field data-invalid={!!errors.capacity}>
                <FieldLabel htmlFor="capacity">Capacity</FieldLabel>
                <Input
                  id="capacity"
                  inputMode="numeric"
                  value={capacity.value}
                  aria-invalid={!!errors.capacity}
                  onChange={(event) => capacity.setValue(event.target.value.replace(/\D/g, ""))}
                />
                <FieldError>{errors.capacity ?? undefined}</FieldError>
              </Field>
            </>
          ),
        }
      },
    },
  }),

  categories: define({
    store: categoryApi,
    segment: "categories",
    singular: "Student Category",
    plural: "Student Categories",
    description: "Student categories such as quotas, used for admission and fees.",
    searchPlaceholder: "Search category name",
    form: { nameRequired: "Insert StudentCategory Name.", useFields: () => noFields },
  }),

  sessions: define({
    store: sessionApi,
    segment: "sessions",
    singular: "Academic Session",
    plural: "Academic Sessions",
    description: "Admission sessions for classes that run across years, such as 2025-26.",
    searchPlaceholder: "Search session name",
    form: { nameRequired: "Enter Academic Session Name", useFields: () => noFields },
  }),

  shifts: define({
    store: shiftApi,
    segment: "shifts",
    singular: "Shift",
    plural: "Shifts",
    description: "Daily sessions such as Morning and Day, in rank order within each institute.",
    searchPlaceholder: "Search shift name",
    form: { nameRequired: "Insert Shift Name.", useFields: () => noFields },
  }),

  branches: define<BranchRow>({
    store: branchApi,
    segment: "branches",
    singular: "Branch",
    plural: "Branches",
    description: "Campuses of each institute. Students, classes and buildings belong to a branch.",
    searchPlaceholder: "Search name or code",
    columns: [branchColumn.accessor("code", { header: "Code", enableSorting: true, meta: { className: "whitespace-nowrap" } })],
    details: (row) => [
      ["Code", row.code],
      ["Address", row.address || "—"],
    ],
    form: {
      nameRequired: "Enter Branch Name",
      useFields: function useBranchFields(row) {
        const code = useText(row?.code ?? "")
        const address = useText(row?.address ?? "")
        return {
          validate: () => ({ code: code.value.trim() ? undefined : "Enter Branch Code" }),
          values: () => ({ code: code.value.trim(), address: address.value.trim() }),
          reset: () => {
            code.setValue("")
            address.setValue("")
          },
          render: (errors: LookupErrors) => (
            <>
              <TextField id="code" label="Code" value={code.value} error={errors.code} onChange={code.setValue} />
              <Field data-invalid={!!errors.address} className="sm:col-span-2">
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <Textarea
                  id="address"
                  value={address.value}
                  aria-invalid={!!errors.address}
                  onChange={(event) => address.setValue(event.target.value)}
                />
                <FieldError>{errors.address}</FieldError>
              </Field>
            </>
          ),
        }
      },
    },
  }),

  years: define<YearRow>({
    store: yearApi,
    segment: "years",
    singular: "Academic Year",
    plural: "Academic Years",
    description: "Years that classes, sections and results are recorded against.",
    searchPlaceholder: "Search name or code",
    columns: [
      yearColumn.accessor("code", { header: "Code", enableSorting: true, meta: { className: "whitespace-nowrap" } }),
      yearColumn.accessor("isCurrentYear", {
        header: "Current Year",
        enableSorting: true,
        cell: ({ row }) => (row.original.isCurrentYear ? "Yes" : "No"),
      }),
    ],
    details: (row) => [
      ["Code", row.code],
      ["Current year", row.isCurrentYear ? "Yes" : "No"],
    ],
    form: {
      nameRequired: "Enter Academic Year Name",
      useFields: function useYearFields(row) {
        const code = useText(row?.code ?? "")
        const [current, setCurrent] = React.useState(row?.isCurrentYear ?? false)
        return {
          validate: () => ({ code: code.value.trim() ? undefined : "Enter Academic Year Code" }),
          values: () => ({ code: code.value.trim(), isCurrentYear: current }),
          reset: () => {
            code.setValue("")
            setCurrent(false)
          },
          render: (errors: LookupErrors) => (
            <>
              <TextField id="code" label="Code" value={code.value} error={errors.code} onChange={code.setValue} />
              <Field orientation="horizontal" className="sm:col-span-2">
                <Checkbox id="isCurrentYear" checked={current} onCheckedChange={(checked) => setCurrent(checked === true)} />
                <FieldLabel htmlFor="isCurrentYear">Current academic year</FieldLabel>
              </Field>
            </>
          ),
        }
      },
    },
  }),
}

export type LookupKey = keyof typeof lookupPages
