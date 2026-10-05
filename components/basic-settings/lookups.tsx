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
import { classApi, publicExamFlags, type ClassRow } from "@/lib/classes-store"
import { groupApi, groupOf, groupStore, legacyGroups, type GroupRow, type LegacyGroup } from "@/lib/groups-store"
import { gradeApi, type GradeRow } from "@/lib/grades-store"
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
const gradeColumn = createDataTableColumns<GradeRow>()

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

const groupColumn = createDataTableColumns<GroupRow>()
const classColumn = createDataTableColumns<ClassRow>()

const legacyGroupLabel = (group: LegacyGroup) => legacyGroups.find((g) => g.group === group)?.label ?? group

// The institute's names for the groups a class offers (the legacy names where it has none).
function ClassGroupNames({ instituteId, groups }: { instituteId: number; groups: LegacyGroup[] }) {
  const named = groupStore.useList(instituteId)
  if (!groups.length) return "—"
  return groups.map((group) => named.find((g) => groupOf(g.id) === group)?.name ?? legacyGroupLabel(group)).join(", ")
}

function ClassNameOf({ id }: { id: number | null }) {
  const academicClass = classStore.useOne(id ?? -1)
  return id == null ? "None" : (academicClass?.name ?? "—")
}

// The institute's other classes, for the class students are promoted from.
function PreviousClassSelect({
  instituteId,
  exceptId,
  value,
  onChange,
}: {
  instituteId: number
  exceptId?: number
  value: string
  onChange: (value: string) => void
}) {
  const classes = classStore.useList(instituteId).filter((c) => c.id !== exceptId && (c.status === "Active" || String(c.id) === value))
  return (
    <OptionSelect
      id="previousAcademicClassId"
      value={value}
      allLabel="None"
      options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
      onChange={onChange}
    />
  )
}

// The groups the institute has named (Academic Group), to tick the ones a class offers.
function GroupChecks({
  instituteId,
  value,
  onChange,
}: {
  instituteId: number
  value: LegacyGroup[]
  onChange: (value: LegacyGroup[]) => void
}) {
  const named = groupStore.useList(instituteId).filter((g) => g.status === "Active")
  if (!named.length) return <p className="text-sm text-muted-foreground">Name the institute&apos;s groups in Academic Group first.</p>
  return (
    <div className="flex flex-wrap gap-4">
      {named.map((g) => {
        const group = groupOf(g.id)
        if (!group) return null
        return (
          <Field key={g.id} orientation="horizontal" className="w-fit">
            <Checkbox
              id={`group-${group}`}
              checked={value.includes(group)}
              onCheckedChange={(checked) => onChange(checked === true ? [...value, group] : value.filter((v) => v !== group))}
            />
            <FieldLabel htmlFor={`group-${group}`}>{g.name}</FieldLabel>
          </Field>
        )
      })}
    </div>
  )
}

type ClassFlag = "hasSession" | "hasSubjectGroup" | "enableBoardAdmission" | (typeof publicExamFlags)[number]["is"]

export const lookupPages = {
  groups: define<GroupRow>({
    store: groupApi,
    segment: "groups",
    singular: "Academic Group",
    plural: "Academic Groups",
    description: "The institute's names for the board's subject groups (Science, Business Studies, Humanities) its classes offer.",
    searchPlaceholder: "Search name, code or Bangla name",
    columns: [
      groupColumn.accessor("group", {
        header: "Group",
        enableSorting: true,
        cell: ({ row }) => legacyGroupLabel(row.original.group),
      }),
      groupColumn.accessor("code", { header: "Code", enableSorting: true }),
      groupColumn.accessor("nameBn", { header: "Name (Bangla)", enableSorting: false, cell: ({ row }) => row.original.nameBn || "—" }),
    ],
    details: (row) => [
      ["Group", legacyGroupLabel(row.group)],
      ["Code", row.code],
      ["Name (Bangla)", row.nameBn || "—"],
    ],
    form: {
      nameRequired: "Insert Academic Group Name.",
      useFields: function useGroupFields(row) {
        const [group, setGroup] = React.useState<string>(row?.group ?? "")
        const code = useText(row?.code ?? "")
        const nameBn = useText(row?.nameBn ?? "")
        return {
          validate: () => ({
            group: group ? undefined : "Select the group.",
            code: code.value.trim() ? undefined : "Insert Academic Group Code.",
          }),
          values: () => ({ group, code: code.value.trim(), nameBn: nameBn.value.trim() }),
          reset: () => {
            setGroup("")
            code.setValue("")
            nameBn.setValue("")
          },
          render: (errors: LookupErrors) => (
            <>
              <Field data-invalid={!!errors.group}>
                <FieldLabel htmlFor="group">Group</FieldLabel>
                {/* Classes store the legacy group, so it can't change once named. */}
                {row ? (
                  <Input id="group" value={legacyGroupLabel(row.group)} disabled />
                ) : (
                  <OptionSelect
                    id="group"
                    value={group}
                    allLabel="Select group"
                    options={legacyGroups.map((g) => ({ value: g.group, label: g.label }))}
                    onChange={setGroup}
                  />
                )}
                <FieldError>{errors.group}</FieldError>
              </Field>
              <TextField id="code" label="Code" value={code.value} error={errors.code} onChange={code.setValue} />
              <TextField id="nameBn" label="Name (Bangla)" value={nameBn.value} error={errors.nameBn} onChange={nameBn.setValue} />
            </>
          ),
        }
      },
    },
  }),

  classes: define<ClassRow>({
    store: classApi,
    segment: "classes",
    singular: "Academic Class",
    plural: "Academic Classes",
    description: "Levels the institute teaches, such as Class Six, in teaching order within each medium.",
    searchPlaceholder: "Search name or Bangla name",
    // Legacy Academic Class Manage has no rank.
    capabilities: { Manage: { reorder: false } },
    columns: [
      classColumn.accessor("nameBn", { header: "Name (Bangla)", enableSorting: true, cell: ({ row }) => row.original.nameBn || "—" }),
      classColumn.accessor("academicMedium", {
        header: "Medium",
        enableSorting: true,
        cell: ({ row }) => (row.original.academicMedium ? mediumLabels[row.original.academicMedium] : "—"),
      }),
      classColumn.display({
        id: "previous",
        header: "Previous class",
        cell: ({ row }) => <ClassNameOf id={row.original.previousAcademicClassId} />,
      }),
      classColumn.display({
        id: "groups",
        header: "Groups",
        cell: ({ row }) =>
          row.original.hasSubjectGroup ? (
            <ClassGroupNames instituteId={row.original.instituteId} groups={row.original.academicGroups} />
          ) : (
            "—"
          ),
      }),
      classColumn.display({
        id: "exams",
        header: "Public exams",
        cell: ({ row }) => publicExamFlags.filter((flag) => row.original[flag.is]).map((flag) => flag.exam).join(", ") || "—",
      }),
    ],
    details: (row) => [
      ["Name (Bangla)", row.nameBn || "—"],
      ["Medium", row.academicMedium ? mediumLabels[row.academicMedium] : "—"],
      ["Roll starts from", row.rollStartFrom || "—"],
      ["Previous class", <ClassNameOf key="previous" id={row.previousAcademicClassId} />],
      ["Has session", row.hasSession ? "Yes" : "No"],
      [
        "Subject groups",
        row.hasSubjectGroup ? <ClassGroupNames key="groups" instituteId={row.instituteId} groups={row.academicGroups} /> : "No",
      ],
      ["Public exams", publicExamFlags.filter((flag) => row[flag.is]).map((flag) => flag.exam).join(", ") || "—"],
      ["Testimonial for", publicExamFlags.find((flag) => row[flag.testimonial])?.exam ?? "—"],
      ["Board admission", row.enableBoardAdmission ? "Yes" : "No"],
    ],
    form: {
      nameRequired: "Insert Academic Class Name.",
      useFields: function useClassFields(row) {
        const nameBn = useText(row?.nameBn ?? "")
        const rollStartFrom = useText(row?.rollStartFrom ?? "")
        const [medium, setMedium] = React.useState<string>(row?.academicMedium ?? "")
        const [previousId, setPreviousId] = React.useState(row?.previousAcademicClassId ? String(row.previousAcademicClassId) : "")
        const [groups, setGroups] = React.useState<LegacyGroup[]>(row?.academicGroups ?? [])
        const [testimonial, setTestimonial] = React.useState<string>(
          publicExamFlags.find((flag) => row?.[flag.testimonial])?.exam ?? ""
        )
        const [flags, setFlags] = React.useState<Record<ClassFlag, boolean>>(() => ({
          hasSession: row?.hasSession ?? false,
          hasSubjectGroup: row?.hasSubjectGroup ?? false,
          enableBoardAdmission: row?.enableBoardAdmission ?? false,
          isJSC: row?.isJSC ?? false,
          isSSC: row?.isSSC ?? false,
          isHSC: row?.isHSC ?? false,
          isOLevel: row?.isOLevel ?? false,
          isALevel: row?.isALevel ?? false,
        }))
        const check = (flag: ClassFlag, label: string) => (
          <Field key={flag} orientation="horizontal" className="w-fit">
            <Checkbox
              id={flag}
              checked={flags[flag]}
              onCheckedChange={(checked) => setFlags((current) => ({ ...current, [flag]: checked === true }))}
            />
            <FieldLabel htmlFor={flag}>{label}</FieldLabel>
          </Field>
        )

        return {
          validate: (institute) => ({
            academicMedium: institute?.enableMedium && !medium ? "No Academic Medium Found." : undefined,
            academicGroups: flags.hasSubjectGroup && !groups.length ? "No Academic Group Selected." : undefined,
          }),
          values: () => ({
            nameBn: nameBn.value.trim(),
            rollStartFrom: rollStartFrom.value.trim(),
            academicMedium: medium || null,
            previousAcademicClassId: previousId ? Number(previousId) : null,
            ...flags,
            academicGroups: flags.hasSubjectGroup ? groups : [],
            ...Object.fromEntries(publicExamFlags.map((flag) => [flag.testimonial, flag.exam === testimonial])),
          }),
          reset: () => {
            nameBn.setValue("")
            rollStartFrom.setValue("")
            setPreviousId("")
          },
          render: (errors: LookupErrors, institute) => (
            <>
              <TextField id="nameBn" label="Name (Bangla)" value={nameBn.value} error={errors.nameBn} onChange={nameBn.setValue} />
              {institute?.enableMedium && (
                <Field data-invalid={!!errors.academicMedium}>
                  <FieldLabel htmlFor="academicMedium">Medium</FieldLabel>
                  <OptionSelect
                    id="academicMedium"
                    value={medium}
                    allLabel="Select medium"
                    options={Object.entries(mediumLabels).map(([value, label]) => ({ value, label }))}
                    onChange={setMedium}
                  />
                  <FieldError>{errors.academicMedium}</FieldError>
                </Field>
              )}
              <TextField
                id="rollStartFrom"
                label="Roll starts from"
                value={rollStartFrom.value}
                error={errors.rollStartFrom}
                onChange={rollStartFrom.setValue}
              />
              {institute && (
                <Field data-invalid={!!errors.previousAcademicClassId}>
                  <FieldLabel htmlFor="previousAcademicClassId">Previous class</FieldLabel>
                  <PreviousClassSelect instituteId={institute.id} exceptId={row?.id} value={previousId} onChange={setPreviousId} />
                  <FieldError>{errors.previousAcademicClassId}</FieldError>
                </Field>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-3 sm:col-span-2">
                {check("hasSession", "Has session")}
                {check("enableBoardAdmission", "Board admission")}
                {check("hasSubjectGroup", "Has subject group")}
              </div>
              {flags.hasSubjectGroup && institute && (
                <Field data-invalid={!!errors.academicGroups} className="sm:col-span-2">
                  <FieldLabel>Subject groups</FieldLabel>
                  <GroupChecks instituteId={institute.id} value={groups} onChange={setGroups} />
                  <FieldError>{errors.academicGroups}</FieldError>
                </Field>
              )}
              <Field className="sm:col-span-2">
                <FieldLabel>Public exams</FieldLabel>
                <div className="flex flex-wrap gap-x-6 gap-y-3">{publicExamFlags.map((flag) => check(flag.is, flag.exam))}</div>
              </Field>
              <Field data-invalid={!!errors.enableTestimonial}>
                <FieldLabel htmlFor="testimonial">Testimonial for</FieldLabel>
                <OptionSelect
                  id="testimonial"
                  value={testimonial}
                  allLabel="None"
                  options={publicExamFlags.map((flag) => ({ value: flag.exam, label: flag.exam }))}
                  onChange={setTestimonial}
                />
                <FieldError>{errors.enableTestimonial}</FieldError>
              </Field>
            </>
          ),
        }
      },
    },
  }),

  grades: define<GradeRow>({
    store: gradeApi,
    segment: "grades",
    singular: "Letter Grade",
    plural: "Letter Grades",
    description: "Marks ranges and the grade point each earns, per medium; results are graded by them.",
    searchPlaceholder: "Search grade name",
    // Legacy Letter Grade Manage has no rank.
    capabilities: { Manage: { reorder: false } },
    columns: [
      gradeColumn.accessor("minimumMarks", {
        header: "Marks",
        enableSorting: true,
        cell: ({ row }) => range(row.original.minimumMarks, row.original.maximumMarks),
        meta: { className: "whitespace-nowrap" },
      }),
      gradeColumn.accessor("gradePoint", {
        header: "Grade point",
        enableSorting: true,
        cell: ({ row }) => `${row.original.gradePoint.toFixed(2)} / ${row.original.maxGradePoint.toFixed(2)}`,
        meta: { className: "whitespace-nowrap tabular-nums" },
      }),
      gradeColumn.accessor("academicMedium", {
        header: "Medium",
        enableSorting: true,
        cell: ({ row }) => (row.original.academicMedium ? mediumLabels[row.original.academicMedium] : "All"),
      }),
    ],
    details: (row) => [
      ["Medium", row.academicMedium ? mediumLabels[row.academicMedium] : "All"],
      ["Marks", range(row.minimumMarks, row.maximumMarks)],
      ["Grade point", row.gradePoint.toFixed(2)],
      ["Max grade point", row.maxGradePoint.toFixed(2)],
    ],
    form: {
      nameRequired: "Insert Letter Grade Name.",
      useFields: function useGradeFields(row) {
        const [medium, setMedium] = React.useState<string>(row?.academicMedium ?? "")
        const minMarks = useText(String(row?.minimumMarks ?? 0))
        const maxMarks = useText(String(row?.maximumMarks ?? 0))
        const gradePoint = useText(String(row?.gradePoint ?? 0))
        const maxGradePoint = useText(String(row?.maxGradePoint ?? 5))
        return {
          validate: (institute) => {
            const errors: LookupErrors = {}
            const maxGpa = institute?.configuration.maximumGpa ?? 5
            if (!isNumber(minMarks.value) || !isNumber(maxMarks.value)) errors.minimumMarks = "Enter the minimum and maximum marks."
            else if (Number(maxMarks.value) > 100) errors.minimumMarks = "Marks must be within 0 and 100."
            else if (Number(minMarks.value) > Number(maxMarks.value)) errors.minimumMarks = "Minimum marks won't exceed Maximum marks."
            if (!isNumber(gradePoint.value)) errors.gradePoint = "Enter the grade point."
            else if (Number(gradePoint.value) > Number(maxGradePoint.value))
              errors.gradePoint = "Grade point can not exceed the max grade point."
            if (!isNumber(maxGradePoint.value)) errors.maxGradePoint = "Enter the max grade point."
            else if (Number(maxGradePoint.value) > maxGpa)
              errors.maxGradePoint = `Can not exceed the institute's maximum GPA (${maxGpa}).`
            return errors
          },
          values: () => ({
            academicMedium: medium || null,
            minimumMarks: Number(minMarks.value),
            maximumMarks: Number(maxMarks.value),
            gradePoint: Number(gradePoint.value),
            maxGradePoint: Number(maxGradePoint.value),
          }),
          reset: () => {
            for (const field of [minMarks, maxMarks, gradePoint]) field.setValue("0")
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
                    onChange={setMedium}
                  />
                </Field>
              )}
              <NumberField id="minimumMarks" label="Minimum marks" value={minMarks.value} error={errors.minimumMarks} onChange={minMarks.setValue} />
              <NumberField id="maximumMarks" label="Maximum marks" value={maxMarks.value} onChange={maxMarks.setValue} />
              <NumberField id="gradePoint" label="Grade point" value={gradePoint.value} error={errors.gradePoint} onChange={gradePoint.setValue} />
              <NumberField
                id="maxGradePoint"
                label="Max grade point"
                value={maxGradePoint.value}
                error={errors.maxGradePoint}
                onChange={maxGradePoint.setValue}
              />
            </>
          ),
        }
      },
    },
  }),

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
