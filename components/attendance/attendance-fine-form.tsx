"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeftIcon, CalendarRangeIcon, SaveIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { classRollLabel, studentIdLabel } from "@/components/students/student-lookups"
import { FilterField } from "@/components/term-exams/term-exam-fields"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { classStore, sectionStore, yearStore } from "@/lib/academic-store"
import {
  defaultFinePeriod,
  fineSheet,
  formatPeriod,
  periodError,
  saveAttendanceFines,
  useAttendanceFines,
  type FineRow,
} from "@/lib/attendance-fines"
import { useAccessibleInstitutes, useCurrentTeacher, useCurrentUser } from "@/lib/current-user"
import type { Institute } from "@/lib/institutes"
import { teacherSectionIds } from "@/lib/section-teachers"
import { useStudentAttendance } from "@/lib/student-attendance"
import { useStudents } from "@/lib/students"
import { cn } from "@/lib/utils"

// Legacy MonthlyAttendanceFineCreateEdit: pick a section and a fine period
// (by default the institute's latest ended one), see how many days each
// student was absent, set the days they are fined for and save. Saving the
// same period again updates it; the manage list's Edit opens it here.
export function AttendanceFineForm() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const students = useStudents()
  const records = useStudentAttendance()
  const fines = useAttendanceFines()
  const user = useCurrentUser()
  const teacher = useCurrentTeacher()
  const canPick = institutes.length > 1

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const sections = sectionStore.useList(iid)

  const period = institute ? defaultFinePeriod(institute.configuration) : undefined
  const dateFrom = param("from") || period?.dateFrom || ""
  const dateTo = param("to") || period?.dateTo || ""
  const year = param("year") || String(years.find((y) => y.isCurrent)?.id ?? "")
  // A teacher fines only the sections they take in the year (legacy
  // LoadTeacherAcademicClass / LoadTeacherSection); admins see them all.
  const own =
    user.role === "Teacher"
      ? new Set(teacher && year ? teacherSectionIds(teacher, Number(year)) : [])
      : null
  const openSections = sections.filter((s) => s.status === "Active" && (!own || own.has(s.id)))
  const selectedClass = classes.find((c) => String(c.id) === param("class"))
  const classSections = openSections.filter((s) => s.classId === selectedClass?.id)
  const section = classSections.find((s) => String(s.id) === param("section"))
  const dateError = institute ? periodError(dateFrom, dateTo) : undefined

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  const ready = institute && selectedClass && year && section && !dateError
  const rows = ready
    ? fineSheet(
        students,
        records,
        fines,
        institute.id,
        { yearId: Number(year), classId: selectedClass.id, sectionId: section.id },
        dateFrom,
        dateTo
      )
    : []
  const missing = [
    !institute && "institute",
    !selectedClass && "class",
    !year && "academic year",
    !section && "section",
  ].filter(Boolean)
  const editing = rows.some((row) => row.saved)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/attendance/fines">
          <ArrowLeftIcon data-icon="inline-start" />
          Monthly attendance fines
        </Link>
      </Button>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">
            {editing ? "Edit" : "Add"} Monthly Attendance Absent Fine
          </CardTitle>
          <CardDescription>
            Pick a section and a fine period to list each student&apos;s absent days, then set the
            days they are fined for. Saving the same period again updates it.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {canPick && (
            <FilterField
              label="Institute"
              required
              value={institute ? String(institute.id) : ""}
              onChange={(v) =>
                setParam({ institute: v, class: "", year: "", section: "", from: "", to: "" })
              }
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
            />
          )}
          <FilterField
            label="Class"
            required
            value={param("class")}
            onChange={(v) => setParam({ class: v, section: "" })}
            options={classes
              .filter((c) => c.status === "Active" && (!own || openSections.some((s) => s.classId === c.id)))
              .map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder="Select class"
            disabled={!institute}
          />
          <FilterField
            label="Academic year"
            required
            value={year}
            onChange={(v) => setParam({ year: v })}
            options={years.map((y) => ({
              value: String(y.id),
              label: y.isCurrent ? `${y.name} (current)` : y.name,
            }))}
            placeholder="Select year"
            disabled={!institute}
          />
          <FilterField
            label="Section"
            required
            value={section ? String(section.id) : ""}
            onChange={(v) => setParam({ section: v })}
            options={classSections.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder={selectedClass ? "Select section" : "Pick a class first"}
            disabled={!selectedClass}
          />
          <PeriodDateField
            label="Date from"
            value={dateFrom}
            onChange={(v) => setParam({ from: v })}
            disabled={!institute}
            error={dateError}
          />
          <PeriodDateField
            label="Date to"
            value={dateTo}
            onChange={(v) => setParam({ to: v })}
            disabled={!institute}
          />
        </CardContent>
      </Card>

      {ready ? (
        <FineSheet
          // Start over from what is saved after a save or a delete elsewhere.
          key={`${section.id}|${year}|${dateFrom}|${dateTo}|${savedKey(rows)}`}
          institute={institute}
          classId={selectedClass.id}
          sectionId={section.id}
          dateFrom={dateFrom}
          dateTo={dateTo}
          rows={rows}
          title={`${selectedClass.name}, Section ${section.name}`}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <CalendarRangeIcon className="size-8 text-muted-foreground" />
            <p className="font-medium">
              {own && institute && year && !openSections.length
                ? "You aren't assigned a section for this academic year."
                : missing.length
                  ? `Select the ${missing.join(", ")}.`
                  : dateError}
            </p>
            <p className="text-sm text-muted-foreground">
              The section&apos;s students are listed here with their absent days.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function savedKey(rows: FineRow[]) {
  const saved = rows.flatMap((row) => (row.saved ? [row.saved.modifiedAt] : []))
  return `${saved.length}|${saved.sort().at(-1) ?? ""}`
}

function PeriodDateField({
  label,
  value,
  onChange,
  disabled,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
}) {
  const id = React.useId()
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>
        {label}
        <span className="text-destructive" aria-hidden>
          *
        </span>
      </FieldLabel>
      <Input
        id={id}
        type="date"
        value={value}
        disabled={disabled}
        onChange={(event) => event.target.value && onChange(event.target.value)}
        aria-invalid={!!error}
      />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

// Legacy _absentStudentList: each student's absent days with the days
// fined (whole numbers) and a remark to fill in, and saving them.
function FineSheet({
  institute,
  classId,
  sectionId,
  dateFrom,
  dateTo,
  rows,
  title,
}: {
  institute: Institute
  classId: number
  sectionId: number
  dateFrom: string
  dateTo: string
  rows: FineRow[]
  title: string
}) {
  const user = useCurrentUser()
  const [fined, setFined] = React.useState<Record<number, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.student.id, String(row.finedDays)]))
  )
  const [remarks, setRemarks] = React.useState<Record<number, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.student.id, row.remarks]))
  )

  const finedOf = (id: number) => Number(fined[id] || 0)
  const totalAbsent = rows.reduce((sum, row) => sum + row.absentDays, 0)
  const totalFined = rows.reduce((sum, row) => sum + finedOf(row.student.id), 0)
  const recounted = rows.filter((row) => row.recountedDays !== undefined).length
  const tooMany = (row: FineRow) => finedOf(row.student.id) > row.absentDays
  const overCount = rows.filter(tooMany).length
  const saved = rows.filter((row) => row.saved)
  const lastSaved = saved
    .map((row) => row.saved!)
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))[0]
  const showRoll = institute.showClassRoll

  function save() {
    try {
      const { added, updated } = saveAttendanceFines(
        {
          instituteId: institute.id,
          classId,
          sectionId,
          dateFrom,
          dateTo,
          entries: rows.map((row) => ({
            studentId: row.student.id,
            absentDays: row.absentDays,
            finedDays: finedOf(row.student.id),
            remarks: remarks[row.student.id] ?? "",
          })),
        },
        user.name
      )
      if (!added && !updated) toast.info("Nothing changed", { description: "The saved fines already match." })
      else
        toast.success("Student absent fine data saved successfully", {
          description: [added && `${added} added`, updated && `${updated} updated`].filter(Boolean).join(", "),
        })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The fines could not be saved.")
    }
  }

  const stats = [
    { label: "Students", value: rows.length, className: "text-foreground" },
    { label: "Absent days", value: totalAbsent, className: "text-rose-600 dark:text-rose-400" },
    { label: "Fined days", value: totalFined, className: "text-amber-600 dark:text-amber-400" },
  ]

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {formatPeriod(dateFrom, dateTo)} ·{" "}
          {lastSaved
            ? `Saved; last by ${lastSaved.modifiedBy} at ${lastSaved.modifiedAt.slice(11, 16)} on ${lastSaved.modifiedAt.slice(0, 10)}.`
            : "No fines saved for this period yet."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {recounted > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              Attendance changed after these fines were saved: {recounted} student
              {recounted === 1 ? "'s" : "s'"} absent days now differ (shown beside the saved
              count). Saving keeps the saved counts.
            </span>
          </div>
        )}

        {overCount > 0 && (
          <p className="text-sm text-destructive">
            {overCount} student{overCount === 1 ? " is" : "s are"} fined for more days than they
            were absent.
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <div className="grid flex-1 grid-cols-3 divide-x rounded-lg border">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-0.5 px-2 py-3">
                <span className={cn("text-2xl font-semibold tabular-nums", stat.className)}>
                  {stat.value}
                </span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
          <Button type="button" className="h-auto min-h-10 sm:w-48" onClick={save} disabled={!rows.length}>
            <SaveIcon data-icon="inline-start" />
            Save fines
          </Button>
        </div>

        {rows.length ? (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="w-12">Sl</TableHead>
                  <TableHead>Student name</TableHead>
                  <TableHead>{showRoll ? classRollLabel(institute) : studentIdLabel(institute)}</TableHead>
                  <TableHead className="text-center">Absent days</TableHead>
                  <TableHead className="w-32">Fined days</TableHead>
                  <TableHead className="min-w-56">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => {
                  const id = row.student.id
                  return (
                    <TableRow key={id}>
                      <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{row.student.name}</TableCell>
                      <TableCell className="tabular-nums">
                        {showRoll ? row.enrolment.classRoll || "—" : row.student.studentIdentificationNo}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {row.absentDays}
                        {row.recountedDays !== undefined && (
                          <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">
                            (now {row.recountedDays})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          inputMode="numeric"
                          className="h-8 text-center tabular-nums"
                          value={fined[id] ?? ""}
                          placeholder="0"
                          aria-invalid={tooMany(row)}
                          title={tooMany(row) ? `At most ${row.absentDays}` : undefined}
                          aria-label={`${row.student.name} fined days`}
                          onChange={(event) =>
                            setFined((current) => ({
                              ...current,
                              [id]: event.target.value.replace(/\D/g, ""),
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={remarks[id] ?? ""}
                          placeholder="Remarks"
                          aria-label={`${row.student.name} remarks`}
                          onChange={(event) =>
                            setRemarks((current) => ({ ...current, [id]: event.target.value }))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No student of this section was absent in the period.
          </p>
        )}

        {rows.length > 0 && (
          <div className="flex justify-center">
            <Button type="button" onClick={save}>
              <SaveIcon data-icon="inline-start" />
              Save fines
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
