"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, CalculatorIcon, Trash2Icon, UsersIcon } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
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
  matchesClearFilter,
  removeStudents,
  useStudents,
  type ClearFilter,
} from "@/lib/students"

// Radix Select can't use "" as a value; "" here means "All …".
const ALL = "__all"

type Filters = {
  institute: string
  branch: string
  medium: string
  class: string
  year: string
  group: string
  version: string
  shift: string
  section: string
}

const empty: Omit<Filters, "institute"> = {
  branch: "",
  medium: "",
  class: "",
  year: "",
  group: "",
  version: "",
  shift: "",
  section: "",
}

// Legacy "Student Clear" (Views/Student/ClearStudent.cshtml): pick an
// institute and year (plus any narrower filters), count the students, then
// permanently delete them — typically last year's leavers.
export function ClearStudents() {
  const students = useStudents()
  const institutes = useAccessibleInstitutes()
  const canPick = institutes.length > 1

  const [filters, setFilters] = React.useState<Filters>(() => ({
    institute: canPick ? "" : String(institutes[0]?.id ?? ""),
    ...empty,
  }))
  // The count from the last "Student Count"; any filter change clears it,
  // as the legacy selects' "resetCount" did.
  const [counted, setCounted] = React.useState<ClearFilter | null>(null)
  const [errors, setErrors] = React.useState<{ institute?: string; year?: string }>({})
  const [confirming, setConfirming] = React.useState(false)

  const institute = institutes.find((i) => String(i.id) === filters.institute)
  const instituteId = institute?.id ?? -1
  const years = yearStore.useList(instituteId)
  const classes = classStore.useList(instituteId)
  const sections = sectionStore.useList(instituteId)
  const branches = branchStore.useList(instituteId)
  const shifts = shiftStore.useList(instituteId)
  const groups = groupStore.useList(instituteId)

  const selectedClass = classes.find((c) => String(c.id) === filters.class)
  const classGroups = selectedClass?.hasSubjectGroup
    ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
    : groups
  const sectionOptions = sections.filter(
    (s) =>
      (!filters.class || String(s.classId) === filters.class) &&
      (!filters.branch || String(s.branchId) === filters.branch) &&
      (!filters.shift || String(s.shiftId) === filters.shift) &&
      (!filters.version || s.version === filters.version) &&
      (!filters.group || s.groupId == null || String(s.groupId) === filters.group)
  )

  const matched = counted ? students.filter((s) => matchesClearFilter(s, counted)) : []

  function set(key: keyof Filters, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      // A new institute starts every other filter over; a new class drops
      // the section and group that belonged to the old one.
      ...(key === "institute" && empty),
      ...(key === "class" && { section: "", group: "" }),
      ...(["branch", "shift", "version", "group"].includes(key) && { section: "" }),
    }))
    setCounted(null)
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function count() {
    const next = {
      institute: institute ? undefined : "Select an institute.",
      year: filters.year ? undefined : "Select an academic year.",
    }
    setErrors(next)
    if (next.institute || next.year || !institute) return
    const id = (value: string) => (value ? Number(value) : null)
    setCounted({
      instituteId: institute.id,
      yearId: Number(filters.year),
      branchId: id(filters.branch),
      medium: filters.medium,
      classId: id(filters.class),
      groupId: id(filters.group),
      version: filters.version,
      shiftId: id(filters.shift),
      sectionId: id(filters.section),
    })
  }

  function clear() {
    const count = matched.length
    removeStudents(matched.map((s) => s.id))
    toast.success(`${count} student${count === 1 ? "" : "s"} deleted permanently`)
    setConfirming(false)
    setCounted(null)
  }

  const yearName = years.find((y) => String(y.id) === filters.year)?.name

  return (
    <div className="px-4 py-4 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Student Clear</CardTitle>
          <CardDescription>
            Permanently delete the students of a year, e.g. leavers who no longer need to be kept.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_14rem]">
            <div className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {canPick && (
                <Filter
                  label="Institute"
                  required
                  value={filters.institute}
                  onChange={(value) => set("institute", value)}
                  options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
                  placeholder="Select institute"
                  error={errors.institute}
                />
              )}
              <Filter
                label="Academic year"
                required
                value={filters.year}
                onChange={(value) => set("year", value)}
                options={years.map((y) => ({
                  value: String(y.id),
                  label: y.isCurrent ? `${y.name} (current)` : y.name,
                }))}
                placeholder="Select year"
                error={errors.year}
                disabled={!institute}
              />
              {institute?.enableBranch && (
                <Filter
                  label="Branch"
                  value={filters.branch}
                  onChange={(value) => set("branch", value)}
                  options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                  allLabel="All branches"
                />
              )}
              {institute?.enableMedium && (
                <Filter
                  label="Academic medium"
                  value={filters.medium}
                  onChange={(value) => set("medium", value)}
                  options={academicMediums.map((m) => ({ value: m, label: m }))}
                  allLabel="All mediums"
                />
              )}
              <Filter
                label="Academic class"
                value={filters.class}
                onChange={(value) => set("class", value)}
                options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
                allLabel="All classes"
                disabled={!institute}
              />
              {institute?.enableGroup && (
                <Filter
                  label="Academic group"
                  value={filters.group}
                  onChange={(value) => set("group", value)}
                  options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
                  allLabel="All groups"
                />
              )}
              {institute?.enableVersion && (
                <Filter
                  label="Academic version"
                  value={filters.version}
                  onChange={(value) => set("version", value)}
                  options={academicVersions.map((v) => ({ value: v, label: v }))}
                  allLabel="All versions"
                />
              )}
              {institute?.enableShift && (
                <Filter
                  label="Shift"
                  value={filters.shift}
                  onChange={(value) => set("shift", value)}
                  options={shifts.map((s) => ({ value: String(s.id), label: s.name }))}
                  allLabel="All shifts"
                />
              )}
              <Filter
                label="Section"
                value={filters.section}
                onChange={(value) => set("section", value)}
                options={sectionOptions.map((s) => ({
                  value: String(s.id),
                  label: filters.class
                    ? s.name
                    : `${classes.find((c) => c.id === s.classId)?.name ?? "—"} · ${s.name}`,
                }))}
                allLabel="All sections"
                disabled={!institute}
              />
            </div>

            <Card className="h-fit border-emerald-600/30 bg-emerald-600/5">
              <CardContent className="flex items-center justify-between gap-3">
                <UsersIcon className="size-8 text-emerald-700 dark:text-emerald-400" />
                <div className="text-right">
                  <div className="text-4xl font-semibold tabular-nums">
                    {counted ? matched.length : "–"}
                  </div>
                  <div className="text-sm text-muted-foreground">Students</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {counted && matched.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {matched
                .slice(0, 8)
                .map((s) => `${s.name} (${s.studentIdentificationNo})`)
                .join(", ")}
              {matched.length > 8 && ` and ${matched.length - 8} more`}.
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-2 border-t pt-4">
            <Button asChild variant="outline">
              <Link href="/students">
                <ArrowLeftIcon data-icon="inline-start" />
                Back
              </Link>
            </Button>
            <Button type="button" variant="secondary" onClick={count}>
              <CalculatorIcon data-icon="inline-start" />
              Student count
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!counted || matched.length === 0}
              onClick={() => setConfirming(true)}
            >
              <Trash2Icon data-icon="inline-start" />
              Clear student
            </Button>
          </div>
          {!counted && (
            <p className="-mt-3 text-center text-xs text-muted-foreground">
              Count the students first; Clear student deletes exactly those.
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Permanently delete {matched.length} student{matched.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Every matching student of {institute?.name}
              {yearName ? ` enrolled in ${yearName}` : ""} is removed with all their
              enrolments, subjects and details. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={clear}>
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Filter({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  allLabel,
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
  allLabel?: string
  error?: string
  disabled?: boolean
}) {
  const id = `clear-${label.toLowerCase().replace(/\W+/g, "-")}`
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
      <Select
        value={value === "" && allLabel ? ALL : value}
        onValueChange={(next) => onChange(next === ALL ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full" aria-invalid={!!error}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
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
