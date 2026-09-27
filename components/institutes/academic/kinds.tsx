import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import {
  branchStore,
  categoryStore,
  classStore,
  groupStore,
  holidayStore,
  houseStore,
  letterGradeStore,
  resultRemarkStore,
  sectionStore,
  sessionStore,
  shiftStore,
  subjectStore,
  yearStore,
  type RecordStore,
} from "@/lib/academic-store"
import {
  academicMediums,
  academicVersions,
  holidayTypes,
  publicExams,
  repetitions,
  sectionGenders,
  type AcademicRecord,
  type Institute,
  type InstituteSettings,
} from "@/lib/institutes"

// Any per-institute record; extra fields are described by the kind's `fields`.
export type EditableRecord = AcademicRecord & Record<string, unknown>

// `null` is an unset record reference (e.g. a class with no branch).
export type FieldValue = string | number | boolean | null
export type FieldValues = Record<string, FieldValue>
export type Errors = Record<string, string | undefined>

export type FieldDef = {
  key: string
  label: string
  type:
    | "text"
    | "textarea"
    | "integer"
    | "decimal"
    | "date"
    | "select"
    | "checkbox"
    | "record"
  options?: readonly string[]
  // Value a new record gets while the field is hidden (defaults to blank).
  fallback?: FieldValue
  // For a record field: the store whose record ids it picks from.
  source?: RecordStore<EditableRecord>
  // For an optional select: label of the "" option, e.g. "All mediums".
  allLabel?: string
  required?: boolean
  unique?: boolean
  // Checkbox that marks the institute's single current record (academic year).
  current?: boolean
  description?: string
  placeholder?: string
  min?: number
  max?: number
  wide?: boolean
  showWhen?: (institute: Institute) => boolean
  hint?: (value: FieldValue, institute: Institute) => string | undefined
}

export type ColumnDef = {
  label: string
  align?: "right"
  showWhen?: (institute: Institute) => boolean
  render: (record: EditableRecord) => ReactNode
}

export type KindConfig = {
  segment: string
  singular: string
  plural: string
  description: string
  fields: FieldDef[]
  columns: ColumnDef[]
  // Institute switch that has to be on before these records can be managed.
  toggle?: keyof InstituteSettings
  // Institute field holding a custom singular label, e.g. "House".
  labelKey?: keyof InstituteSettings
  // Extra keys that uniqueness is checked within, e.g. ["medium"].
  uniqueScope?: string[]
  // False lists records in the store's sort order without rank controls.
  ranked?: boolean
  validate?: (
    values: FieldValues,
    context: { institute: Institute; siblings: EditableRecord[] }
  ) => Errors
  // Why a record can't be deleted yet, e.g. a class that still has sections.
  inUse?: (record: EditableRecord) => string | undefined
  store: RecordStore<EditableRecord>
}

function asEditable<T extends AcademicRecord>(store: RecordStore<T>) {
  return store as unknown as RecordStore<EditableRecord>
}

const num = (value: unknown) => Number(value ?? 0)

function formatNumber(value: unknown, digits = 2) {
  return num(value).toFixed(digits).replace(/\.?0+$/, "")
}

function range(min: unknown, max: unknown, digits = 2) {
  return `${formatNumber(min, digits)}–${formatNumber(max, digits)}`
}

const mediumEnabled = (institute: Institute) => institute.enableMedium

const mediumField: FieldDef = {
  key: "medium",
  label: "Medium",
  type: "select",
  options: academicMediums,
  allLabel: "All mediums",
  showWhen: mediumEnabled,
}

const mediumColumn: ColumnDef = {
  label: "Medium",
  showWhen: mediumEnabled,
  render: (record) => String(record.medium || "All mediums"),
}

// Name of a referenced record; `fallback` when unset or since deleted.
function RecordName({
  store,
  id,
  fallback = "—",
}: {
  store: RecordStore<EditableRecord>
  id: unknown
  fallback?: string
}) {
  const record = store.useOne(id == null ? -1 : Number(id))
  return record ? record.name : fallback
}

// "Used by 2 sections." when other records still point at this one.
function usedBy(
  store: RecordStore<EditableRecord>,
  key: string,
  record: EditableRecord,
  noun: string,
  plural: string
) {
  const count = store
    .getList(record.instituteId)
    .filter((other) => other[key] === record.id).length
  if (!count) return undefined
  return `Used by ${count} ${count === 1 ? noun : plural}.`
}

const jsWeekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function formatDateRange(start: string, end: string) {
  const format = (value: string, withYear: boolean) =>
    parseIsoDate(value).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      ...(withYear && { year: "numeric" }),
    })
  if (!end || start === end) return format(start, true)
  return `${format(start, start.slice(0, 4) !== end.slice(0, 4))} – ${format(end, true)}`
}

function dayCount(start: string, end: string) {
  const days =
    Math.round(
      (parseIsoDate(end || start).getTime() - parseIsoDate(start).getTime()) /
        86_400_000
    ) + 1
  return `${days} day${days === 1 ? "" : "s"}`
}

function weekendHint(value: FieldValue, institute: Institute) {
  if (typeof value !== "string" || !value) return undefined
  const weekday = jsWeekdays[parseIsoDate(value).getDay()]
  return (institute.weekend as string[]).includes(weekday)
    ? `This is a ${weekday}, already a weekend for this institute.`
    : undefined
}

function checkRange(
  errors: Errors,
  values: FieldValues,
  minKey: string,
  maxKey: string,
  label: string
) {
  if (num(values[minKey]) < 0) errors[minKey] = `${label} can not be negative.`
  else if (num(values[minKey]) > num(values[maxKey])) {
    errors[minKey] = `Minimum ${label.toLowerCase()} won't exceed the maximum.`
  }
}

export const academicKinds = {
  branches: {
    segment: "branches",
    singular: "Branch",
    plural: "Branches",
    description: "Campuses of this institute. Students and classes belong to a branch.",
    toggle: "enableBranch",
    fields: [
      { key: "code", label: "Code", type: "text", required: true, unique: true },
      { key: "address", label: "Address", type: "textarea", wide: true },
    ],
    columns: [
      { label: "Code", render: (r) => String(r.code || "—") },
      {
        label: "Address",
        render: (r) => (
          <span className="block max-w-64 truncate text-muted-foreground">
            {String(r.address || "—")}
          </span>
        ),
      },
    ],
    inUse: (record) =>
      usedBy(asEditable(classStore), "branchId", record, "class", "classes"),
    store: asEditable(branchStore),
  },
  shifts: {
    segment: "shifts",
    singular: "Shift",
    plural: "Shifts",
    description: "Daily sessions such as Morning and Day, used by classes and routines.",
    toggle: "enableShift",
    fields: [],
    columns: [],
    inUse: (record) =>
      usedBy(asEditable(sectionStore), "shiftId", record, "section", "sections"),
    store: asEditable(shiftStore),
  },
  groups: {
    segment: "groups",
    singular: "Group",
    plural: "Groups",
    description: "Streams such as Science or Humanities that a class can be split into.",
    toggle: "enableGroup",
    fields: [
      { key: "code", label: "Code", type: "text", required: true, unique: true },
      { key: "nameBn", label: "Name (Bangla)", type: "text" },
    ],
    columns: [
      { label: "Code", render: (r) => String(r.code || "—") },
      { label: "Name (Bangla)", render: (r) => String(r.nameBn || "—") },
    ],
    store: asEditable(groupStore),
  },
  classes: {
    segment: "classes",
    singular: "Class",
    plural: "Classes",
    description: "Levels the institute teaches, such as Class Six, in teaching order.",
    uniqueScope: ["branchId", "medium", "version"],
    fields: [
      { key: "nameBn", label: "Name (Bangla)", type: "text", required: true },
      {
        key: "branchId",
        label: "Branch",
        type: "record",
        required: true,
        source: asEditable(branchStore),
        showWhen: (institute) => institute.enableBranch,
      },
      {
        key: "medium",
        label: "Medium",
        type: "select",
        options: academicMediums,
        required: true,
        showWhen: mediumEnabled,
      },
      {
        key: "version",
        label: "Version",
        type: "select",
        options: academicVersions,
        required: true,
        showWhen: (institute) => institute.enableVersion,
      },
      {
        key: "publicExam",
        label: "Public exam",
        type: "select",
        options: publicExams,
        allLabel: "None",
        description: "The board exam students of this class sit, if any.",
      },
    ],
    columns: [
      { label: "Name (Bangla)", render: (r) => String(r.nameBn || "—") },
      {
        label: "Branch",
        showWhen: (institute) => institute.enableBranch,
        render: (r) => <RecordName store={asEditable(branchStore)} id={r.branchId} />,
      },
      {
        label: "Medium",
        showWhen: mediumEnabled,
        render: (r) => String(r.medium || "—"),
      },
      {
        label: "Version",
        showWhen: (institute) => institute.enableVersion,
        render: (r) => String(r.version || "—"),
      },
      {
        label: "Public exam",
        render: (r) =>
          r.publicExam ? <Badge variant="outline">{String(r.publicExam)}</Badge> : "—",
      },
    ],
    inUse: (record) =>
      usedBy(asEditable(sectionStore), "classId", record, "section", "sections"),
    store: asEditable(classStore),
  },
  sections: {
    segment: "sections",
    singular: "Section",
    plural: "Sections",
    description: "Divisions of a class, such as Section A, that students are placed in.",
    uniqueScope: ["classId", "shiftId"],
    fields: [
      {
        key: "classId",
        label: "Class",
        type: "record",
        required: true,
        source: asEditable(classStore),
      },
      {
        key: "shiftId",
        label: "Shift",
        type: "record",
        required: true,
        source: asEditable(shiftStore),
        showWhen: (institute) => institute.enableShift,
      },
      {
        key: "capacity",
        label: "Capacity",
        type: "integer",
        min: 0,
        description: "Seats in this section. Use 0 for no limit.",
      },
      {
        key: "gender",
        label: "Gender",
        type: "select",
        options: sectionGenders,
        required: true,
        fallback: "Any",
        showWhen: (institute) => institute.enableSectionGender,
      },
    ],
    columns: [
      {
        label: "Class",
        render: (r) => <RecordName store={asEditable(classStore)} id={r.classId} />,
      },
      {
        label: "Shift",
        showWhen: (institute) => institute.enableShift,
        render: (r) => <RecordName store={asEditable(shiftStore)} id={r.shiftId} />,
      },
      {
        label: "Gender",
        showWhen: (institute) => institute.enableSectionGender,
        render: (r) => String(r.gender || "Any"),
      },
      {
        label: "Capacity",
        align: "right",
        render: (r) => (num(r.capacity) ? num(r.capacity).toLocaleString() : "Unlimited"),
      },
    ],
    store: asEditable(sectionStore),
  },
  subjects: {
    segment: "subjects",
    singular: "Subject",
    plural: "Subjects",
    description: "The subject catalog, with the default full and pass marks for each.",
    fields: [
      { key: "code", label: "Code", type: "text", required: true, unique: true },
      { key: "nameBn", label: "Name (Bangla)", type: "text", required: true },
      { key: "fullMarks", label: "Full marks", type: "integer", required: true, min: 1 },
      { key: "passMarks", label: "Pass marks", type: "integer", required: true, min: 0 },
    ],
    columns: [
      { label: "Code", render: (r) => String(r.code || "—") },
      { label: "Name (Bangla)", render: (r) => String(r.nameBn || "—") },
      {
        label: "Pass / Full",
        align: "right",
        render: (r) => `${num(r.passMarks)} / ${num(r.fullMarks)}`,
      },
    ],
    validate: (values) => {
      const errors: Errors = {}
      if (num(values.passMarks) > num(values.fullMarks)) {
        errors.passMarks = "Pass marks can not exceed full marks."
      }
      return errors
    },
    store: asEditable(subjectStore),
  },
  years: {
    segment: "years",
    singular: "Academic year",
    plural: "Academic years",
    description: "Years that classes, sections and results are recorded against.",
    fields: [
      { key: "code", label: "Code", type: "text", required: true, unique: true },
      {
        key: "isCurrent",
        label: "Current academic year",
        type: "checkbox",
        current: true,
        wide: true,
      },
    ],
    columns: [{ label: "Code", render: (r) => String(r.code || "—") }],
    store: asEditable(yearStore),
  },
  sessions: {
    segment: "sessions",
    singular: "Session",
    plural: "Sessions",
    description: "Admission sessions for classes that run across years, such as 2025-26.",
    fields: [],
    columns: [],
    store: asEditable(sessionStore),
  },
  houses: {
    segment: "houses",
    singular: "House",
    plural: "Houses",
    description: "Student houses used for co-curricular groups and competitions.",
    toggle: "enableStudentHouse",
    labelKey: "studentHouseLabel",
    fields: [
      {
        key: "capacity",
        label: "Capacity",
        type: "integer",
        min: 0,
        description: "Use 0 for no limit.",
      },
    ],
    columns: [
      {
        label: "Capacity",
        align: "right",
        render: (r) => (num(r.capacity) ? num(r.capacity).toLocaleString() : "Unlimited"),
      },
    ],
    store: asEditable(houseStore),
  },
  categories: {
    segment: "categories",
    singular: "Category",
    plural: "Categories",
    description: "Student categories such as quotas, used for admission and fees.",
    toggle: "enableStudentCategory",
    labelKey: "studentCategoryLabel",
    fields: [],
    columns: [],
    store: asEditable(categoryStore),
  },
  grades: {
    segment: "grades",
    singular: "Letter grade",
    plural: "Letter grades",
    description: "Marks ranges and the grade point each range earns.",
    uniqueScope: ["medium"],
    fields: [
      mediumField,
      { key: "minMarks", label: "Minimum marks", type: "decimal", required: true, min: 0, max: 100 },
      { key: "maxMarks", label: "Maximum marks", type: "decimal", required: true, min: 0, max: 100 },
      { key: "gradePoint", label: "Grade point", type: "decimal", required: true, min: 0 },
      {
        key: "maxGradePoint",
        label: "Max grade point",
        type: "decimal",
        required: true,
        min: 0,
        description: "Usually the institute's maximum GPA.",
      },
    ],
    columns: [
      { label: "Marks", render: (r) => range(r.minMarks, r.maxMarks) },
      {
        label: "Grade point",
        render: (r) => `${num(r.gradePoint).toFixed(2)} / ${num(r.maxGradePoint).toFixed(2)}`,
      },
      mediumColumn,
    ],
    validate: (values, { institute, siblings }) => {
      const errors: Errors = {}
      const maxGpa = institute.configuration.maximumGpa
      checkRange(errors, values, "minMarks", "maxMarks", "Marks")
      if (num(values.maxMarks) > 100) errors.maxMarks = "Marks can not exceed 100."
      if (num(values.gradePoint) > num(values.maxGradePoint)) {
        errors.gradePoint = "Grade point can not exceed the max grade point."
      }
      if (num(values.maxGradePoint) > maxGpa) {
        errors.maxGradePoint = `Can not exceed the institute's maximum GPA (${maxGpa}).`
      }
      const overlap = siblings.find(
        (grade) =>
          grade.medium === values.medium &&
          num(grade.minMarks) <= num(values.maxMarks) &&
          num(values.minMarks) <= num(grade.maxMarks)
      )
      if (overlap && !errors.minMarks) {
        errors.minMarks = `Overlaps ${overlap.name} (${range(overlap.minMarks, overlap.maxMarks)}).`
      }
      return errors
    },
    store: asEditable(letterGradeStore),
  },
  remarks: {
    segment: "remarks",
    singular: "Result remark",
    plural: "Result remarks",
    description: "Remarks printed on results for a GPA, marks or fail-count range.",
    uniqueScope: ["medium"],
    fields: [
      mediumField,
      { key: "minGpa", label: "Minimum GPA", type: "decimal", required: true, min: 0 },
      { key: "maxGpa", label: "Maximum GPA", type: "decimal", required: true, min: 0 },
      { key: "minMarks", label: "Minimum marks", type: "decimal", required: true, min: 0, max: 100 },
      { key: "maxMarks", label: "Maximum marks", type: "decimal", required: true, min: 0, max: 100 },
      { key: "minFailCount", label: "Minimum fail count", type: "integer", required: true, min: 0 },
      { key: "maxFailCount", label: "Maximum fail count", type: "integer", required: true, min: 0 },
      {
        key: "basedOnGrading",
        label: "Based on grading",
        type: "checkbox",
        description: "Use the GPA range instead of the marks range.",
      },
      {
        key: "isGolden",
        label: "Golden",
        type: "checkbox",
        description: "Golden GPA: the top grade in every subject.",
      },
    ],
    columns: [
      {
        label: "GPA",
        render: (r) => (
          <span className="flex items-center gap-2">
            {range(r.minGpa, r.maxGpa)}
            {Boolean(r.isGolden) && (
              <Badge className="bg-amber-500 text-white">Golden</Badge>
            )}
          </span>
        ),
      },
      { label: "Marks", render: (r) => range(r.minMarks, r.maxMarks) },
      { label: "Fail count", render: (r) => range(r.minFailCount, r.maxFailCount, 0) },
      mediumColumn,
    ],
    validate: (values, { institute }) => {
      const errors: Errors = {}
      const maxGpa = institute.configuration.maximumGpa
      checkRange(errors, values, "minGpa", "maxGpa", "GPA")
      if (num(values.maxGpa) > maxGpa) {
        errors.maxGpa = `Can not exceed the institute's maximum GPA (${maxGpa}).`
      }
      checkRange(errors, values, "minMarks", "maxMarks", "Marks")
      if (num(values.maxMarks) > 100) errors.maxMarks = "Marks can not exceed 100."
      checkRange(errors, values, "minFailCount", "maxFailCount", "Fail count")
      return errors
    },
    store: asEditable(resultRemarkStore),
  },
  holidays: {
    segment: "holidays",
    singular: "Holiday or event",
    plural: "Holidays & events",
    description: "The institute calendar: public holidays, closures and events.",
    ranked: false,
    fields: [
      { key: "type", label: "Type", type: "select", options: holidayTypes, required: true },
      { key: "repetition", label: "Repeats", type: "select", options: repetitions, required: true },
      { key: "startDate", label: "Start date", type: "date", required: true, hint: weekendHint },
      { key: "endDate", label: "End date", type: "date", required: true },
      mediumField,
      { key: "description", label: "Description", type: "textarea", wide: true },
    ],
    columns: [
      {
        label: "Date",
        render: (r) => (
          <span className="flex flex-col">
            {formatDateRange(String(r.startDate), String(r.endDate))}
            <span className="text-xs text-muted-foreground">
              {dayCount(String(r.startDate), String(r.endDate))}
            </span>
          </span>
        ),
      },
      {
        label: "Type",
        render: (r) => (
          <Badge variant={r.type === "Gazetted" ? "default" : "outline"}>
            {String(r.type)}
          </Badge>
        ),
      },
      { label: "Repeats", render: (r) => String(r.repetition) },
      mediumColumn,
    ],
    validate: (values) => {
      const errors: Errors = {}
      if (values.startDate && values.endDate && values.endDate < values.startDate) {
        errors.endDate = "End date must be on or after the start date."
      }
      return errors
    },
    store: asEditable(holidayStore),
  },
} satisfies Record<string, KindConfig>

export type AcademicKind = keyof typeof academicKinds

export const academicKindOrder: AcademicKind[] = [
  "branches",
  "shifts",
  "years",
  "sessions",
  "groups",
  "classes",
  "sections",
  "subjects",
  "houses",
  "categories",
  "grades",
  "remarks",
  "holidays",
]

export function kindConfig(kind: AcademicKind): KindConfig {
  return academicKinds[kind]
}

export function isKindEnabled(kind: AcademicKind, institute: Institute) {
  const { toggle } = kindConfig(kind)
  return toggle ? Boolean(institute[toggle]) : true
}

// Fields and columns that apply to this institute (e.g. medium only when enabled).
export function visibleFields(kind: AcademicKind, institute: Institute) {
  return kindConfig(kind).fields.filter((f) => !f.showWhen || f.showWhen(institute))
}

export function visibleColumns(kind: AcademicKind, institute: Institute) {
  return kindConfig(kind).columns.filter((c) => !c.showWhen || c.showWhen(institute))
}

// Singular/plural labels, using the institute's custom label when it has one.
export function kindLabels(kind: AcademicKind, institute: Institute) {
  const config = kindConfig(kind)
  const custom = config.labelKey ? String(institute[config.labelKey]).trim() : ""
  if (!custom) return { singular: config.singular, plural: config.plural }
  return { singular: custom, plural: pluralize(custom) }
}

function pluralize(word: string) {
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`
  return `${word}s`
}
