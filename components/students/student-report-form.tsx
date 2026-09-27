"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { exportStudentReport } from "@/components/students/student-report-export"
import { useStudentReport } from "@/components/students/use-student-report"
import { Badge } from "@/components/ui/badge"
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
  branchStore,
  classStore,
  groupStore,
  sectionStore,
  shiftStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { academicMediums, academicVersions } from "@/lib/institutes"
import {
  columnLabel,
  decodeConfig,
  DEFAULT_ROWS_PER_PAGE,
  DEFAULT_TITLE,
  encodeConfig,
  reportColumns,
  type ReportConfig,
  type StudentStatus,
} from "@/lib/student-report"
import { genders, studentTypes, type Gender, type StudentType } from "@/lib/students"
import { cn } from "@/lib/utils"

// Radix Select can't use "" as a value; "" here means "All …".
const ALL = "__all"

const defaultColumns = ["Roll", "StudentIdentityNo", "FullName", "Gender", "AcademicClass", "Section", "FatherName", "Mobile"]

type Form = {
  institute: string
  branch: string
  medium: string
  class: string
  group: string
  shift: string
  year: string
  section: string
  version: string
  studentType: string
  gender: string
  status: StudentStatus
  orientation: "portrait" | "landscape"
  title: string
  extraFields: string
  rowsPerPage: string
  signature1: string
  signature2: string
  signature3: string
}

const id = (value: number | null | undefined) => (value == null ? "" : String(value))

function fromConfig(config: ReportConfig | null, instituteId: string): Form {
  const f = config?.filter
  return {
    institute: f ? String(f.instituteId) : instituteId,
    branch: id(f?.branchId),
    medium: f?.medium ?? "",
    class: id(f?.classId),
    group: id(f?.groupId),
    shift: id(f?.shiftId),
    year: id(f?.yearId),
    section: id(f?.sectionId),
    version: f?.version ?? "",
    studentType: f?.studentType ?? "",
    gender: f?.gender ?? "",
    status: f?.status ?? "current",
    orientation: config?.orientation ?? "portrait",
    title: config && config.title !== DEFAULT_TITLE ? config.title : "",
    extraFields: config?.extraFields.join(", ") ?? "",
    rowsPerPage: config && config.rowsPerPage !== DEFAULT_ROWS_PER_PAGE ? String(config.rowsPerPage) : "",
    signature1: config?.signatures[0] ?? "Class Teacher",
    signature2: config?.signatures[1] ?? "Vice-Principal",
    signature3: config?.signatures[2] ?? "Principal",
  }
}

// Legacy "Student Dynamic Report" (Views/Student/StudentDynamicReport.cshtml):
// choose the information to show and which students, then print it as a
// paged report or export it to Excel.
export function StudentReportForm() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const canPick = institutes.length > 1

  const initial = decodeConfig(searchParams.get("q"))
  const [form, setForm] = React.useState<Form>(() =>
    fromConfig(initial, canPick ? "" : String(institutes[0]?.id ?? ""))
  )
  const [columns, setColumns] = React.useState<string[]>(initial?.columns ?? defaultColumns)
  const [search, setSearch] = React.useState("")
  const [errors, setErrors] = React.useState<{ institute?: string; columns?: string; rowsPerPage?: string }>({})
  const [exporting, setExporting] = React.useState(false)

  const institute = institutes.find((i) => String(i.id) === form.institute)
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const sections = sectionStore.useList(iid)
  const branches = branchStore.useList(iid)
  const shifts = shiftStore.useList(iid)
  const groups = groupStore.useList(iid)

  const selectedClass = classes.find((c) => String(c.id) === form.class)
  const classGroups = selectedClass?.hasSubjectGroup
    ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
    : groups
  const sectionOptions = sections.filter(
    (s) =>
      (!form.class || String(s.classId) === form.class) &&
      (!form.branch || String(s.branchId) === form.branch) &&
      (!form.shift || String(s.shiftId) === form.shift) &&
      (!form.version || s.version === form.version)
  )
  const available = reportColumns.filter((c) => !institute || !c.when || c.when(institute))
  const chosen = columns.filter((key) => available.some((c) => c.key === key))

  const config = buildConfig()
  const { rows, lookups } = useStudentReport(config)

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "institute" && {
        branch: "", medium: "", class: "", group: "", shift: "", year: "", section: "", version: "",
      }),
      ...(key === "class" && { section: "", group: "" }),
      ...((key === "branch" || key === "shift" || key === "version") && { section: "" }),
    }))
    if (key === "institute") setErrors((current) => ({ ...current, institute: undefined }))
  }

  function buildConfig(): ReportConfig | null {
    if (!institute) return null
    const toId = (value: string) => (value ? Number(value) : null)
    const rowsPerPage = Number(form.rowsPerPage)
    return {
      filter: {
        instituteId: institute.id,
        branchId: toId(form.branch),
        medium: form.medium,
        classId: toId(form.class),
        groupId: toId(form.group),
        shiftId: toId(form.shift),
        yearId: toId(form.year),
        sectionId: toId(form.section),
        version: form.version,
        studentType: form.studentType as StudentType | "",
        gender: form.gender as Gender | "",
        status: form.status,
      },
      columns: chosen,
      orientation: form.orientation,
      title: form.title.trim() || DEFAULT_TITLE,
      extraFields: form.extraFields
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
      rowsPerPage: Number.isInteger(rowsPerPage) && rowsPerPage > 0 ? rowsPerPage : DEFAULT_ROWS_PER_PAGE,
      signatures: [form.signature1, form.signature2, form.signature3].map((s) => s.trim()),
    }
  }

  function validate() {
    const next = {
      institute: institute ? undefined : "Select an institute.",
      columns: chosen.length ? undefined : "Choose at least one piece of information.",
      rowsPerPage:
        form.rowsPerPage && !(Number.isInteger(Number(form.rowsPerPage)) && Number(form.rowsPerPage) > 0)
          ? "Enter a whole number of rows."
          : undefined,
    }
    setErrors(next)
    return !next.institute && !next.columns && !next.rowsPerPage
  }

  function generate() {
    if (!validate() || !config) return
    const q = encodeConfig(config)
    // Keep the choices in this page's URL so Back from the report restores them.
    router.replace(`${pathname}?q=${q}`)
    router.push(`/print/student-report?q=${q}`)
  }

  async function exportFile() {
    if (!validate() || !config || !institute) return
    if (!rows.length) {
      toast.error("No students match these filters.")
      return
    }
    setExporting(true)
    try {
      await exportStudentReport({ config, rows, institute, lookups })
    } catch {
      toast.error("The Excel file couldn't be created.")
    } finally {
      setExporting(false)
    }
  }

  function toggle(key: string, on: boolean) {
    setColumns((current) => (on ? [...current.filter((k) => k !== key), key] : current.filter((k) => k !== key)))
    setErrors((current) => ({ ...current, columns: undefined }))
  }

  function move(key: string, by: -1 | 1) {
    setColumns((current) => {
      const list = current.filter((k) => available.some((c) => c.key === k))
      const i = list.indexOf(key)
      const j = i + by
      if (i < 0 || j < 0 || j >= list.length) return list
      ;[list[i], list[j]] = [list[j], list[i]]
      return list
    })
  }

  const needle = search.trim().toLowerCase()
  const listed = available.filter((c) => !needle || columnLabel(c, institute).toLowerCase().includes(needle))
  const labelOf = (key: string) => {
    const column = available.find((c) => c.key === key)
    return column ? columnLabel(column, institute) : key
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Student Dynamic Report</CardTitle>
          <CardDescription>
            Choose the information and the students, then generate a printable report or export
            it to Excel.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Information to show */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold">
                Information
                <span className="text-destructive" aria-hidden>
                  *
                </span>
              </h4>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setColumns(available.map((c) => c.key))}>
                  Select all
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setColumns([])}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find information"
                aria-label="Find information"
                className="pl-8"
              />
            </div>
            <div className="grid max-h-72 grid-cols-1 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
              {listed.map((column) => {
                const inputId = `col-${column.key}`
                return (
                  <Field key={column.key} orientation="horizontal" className="rounded px-1.5 py-1 hover:bg-muted">
                    <Checkbox
                      id={inputId}
                      checked={chosen.includes(column.key)}
                      onCheckedChange={(checked) => toggle(column.key, checked === true)}
                    />
                    <FieldLabel htmlFor={inputId} className="font-normal">
                      {columnLabel(column, institute)}
                    </FieldLabel>
                  </Field>
                )
              })}
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                {chosen.length
                  ? `${chosen.length} column${chosen.length === 1 ? "" : "s"}, in this order:`
                  : "Nothing chosen yet."}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {chosen.map((key, index) => (
                  <Badge key={key} variant="secondary" className="gap-0.5 pr-0.5">
                    {labelOf(key)}
                    <button
                      type="button"
                      className="rounded p-0.5 hover:bg-background disabled:opacity-30"
                      onClick={() => move(key, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${labelOf(key)} earlier`}
                    >
                      <ArrowUpIcon className="size-3 -rotate-90" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-0.5 hover:bg-background disabled:opacity-30"
                      onClick={() => move(key, 1)}
                      disabled={index === chosen.length - 1}
                      aria-label={`Move ${labelOf(key)} later`}
                    >
                      <ArrowDownIcon className="size-3 -rotate-90" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-0.5 hover:bg-background"
                      onClick={() => toggle(key, false)}
                      aria-label={`Remove ${labelOf(key)}`}
                    >
                      <XIcon className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {errors.columns && <p className="text-sm text-destructive">{errors.columns}</p>}
            </div>
          </div>

          {/* Students and layout */}
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {canPick && (
                <Pick
                  label="Institute"
                  required
                  value={form.institute}
                  onChange={(v) => set("institute", v)}
                  options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
                  placeholder="Select an institute"
                  error={errors.institute}
                />
              )}
              {institute?.enableBranch && (
                <Pick label="Branch" value={form.branch} onChange={(v) => set("branch", v)} all="All branches"
                  options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />
              )}
              {institute?.enableMedium && (
                <Pick label="Medium" value={form.medium} onChange={(v) => set("medium", v)} all="All mediums"
                  options={academicMediums.map((m) => ({ value: m, label: m }))} />
              )}
              <Pick label="Class" value={form.class} onChange={(v) => set("class", v)} all="All classes"
                options={classes.map((c) => ({ value: String(c.id), label: c.name }))} disabled={!institute} />
              {institute?.enableGroup && (
                <Pick label="Group" value={form.group} onChange={(v) => set("group", v)} all="All groups"
                  options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))} />
              )}
              {institute?.enableShift && (
                <Pick label="Shift" value={form.shift} onChange={(v) => set("shift", v)} all="All shifts"
                  options={shifts.map((s) => ({ value: String(s.id), label: s.name }))} />
              )}
              <Pick label="Year" value={form.year} onChange={(v) => set("year", v)} all="All years"
                options={years.map((y) => ({ value: String(y.id), label: y.isCurrent ? `${y.name} (current)` : y.name }))}
                disabled={!institute} />
              <Pick label="Section" value={form.section} onChange={(v) => set("section", v)} all="All sections"
                options={sectionOptions.map((s) => ({
                  value: String(s.id),
                  label: form.class ? s.name : `${classes.find((c) => c.id === s.classId)?.name ?? "—"} · ${s.name}`,
                }))}
                disabled={!institute} />
              {institute?.enableVersion && (
                <Pick label="Version" value={form.version} onChange={(v) => set("version", v)} all="All versions"
                  options={academicVersions.map((v) => ({ value: v, label: v }))} />
              )}
              <Pick label="Student type" value={form.studentType} onChange={(v) => set("studentType", v)} all="All student types"
                options={studentTypes.map((t) => ({ value: t, label: t }))} />
              <Pick label="Gender" value={form.gender} onChange={(v) => set("gender", v)} all="All genders"
                options={genders.map((g) => ({ value: g, label: g }))} />
              <Pick label="Students" value={form.status} onChange={(v) => set("status", v as StudentStatus)}
                options={[
                  { value: "current", label: "Current students" },
                  { value: "previous", label: "Previous students" },
                  { value: "all", label: "All students" },
                ]} />
            </div>

            <div className="grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
              <Pick label="Orientation" value={form.orientation} onChange={(v) => set("orientation", v as Form["orientation"])}
                options={[
                  { value: "portrait", label: "Portrait" },
                  { value: "landscape", label: "Landscape" },
                ]} />
              <Text label="Report title" value={form.title} onChange={(v) => set("title", v)} placeholder={DEFAULT_TITLE} />
              <Text label="Rows per page" value={form.rowsPerPage} onChange={(v) => set("rowsPerPage", v)}
                placeholder={String(DEFAULT_ROWS_PER_PAGE)} inputMode="numeric" error={errors.rowsPerPage} />
              <Text label="Extra empty columns" value={form.extraFields} onChange={(v) => set("extraFields", v)}
                placeholder="e.g. Signature, Remarks" description="Comma-separated; printed blank for writing in."
                className="sm:col-span-2 lg:col-span-3" />
              <Text label="Signature 1" value={form.signature1} onChange={(v) => set("signature1", v)} />
              <Text label="Signature 2" value={form.signature2} onChange={(v) => set("signature2", v)} />
              <Text label="Signature 3" value={form.signature3} onChange={(v) => set("signature3", v)} />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
              <span className="mr-auto text-sm text-muted-foreground">
                {institute ? `${rows.length} student${rows.length === 1 ? "" : "s"} match` : ""}
              </span>
              <Button type="button" variant="outline" onClick={exportFile} disabled={exporting}>
                <FileSpreadsheetIcon data-icon="inline-start" />
                {exporting ? "Exporting…" : "Export"}
              </Button>
              <Button type="button" onClick={generate}>
                <FileTextIcon data-icon="inline-start" />
                Generate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Pick({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  all,
  error,
  disabled,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  // Offers an "All …" choice (value "").
  all?: string
  error?: string
  disabled?: boolean
}) {
  const inputId = React.useId()
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={inputId}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </FieldLabel>
      <Select value={value === "" && all ? ALL : value} onValueChange={(next) => onChange(next === ALL ? "" : next)} disabled={disabled}>
        <SelectTrigger id={inputId} className="w-full" aria-invalid={!!error}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {all && <SelectItem value={ALL}>{all}</SelectItem>}
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

function Text({
  label,
  value,
  onChange,
  placeholder,
  description,
  error,
  inputMode,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  description?: string
  error?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  className?: string
}) {
  const inputId = React.useId()
  return (
    <Field data-invalid={!!error} className={cn(className)}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input
        id={inputId}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        aria-invalid={!!error}
        onChange={(event) => onChange(event.target.value)}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  )
}
