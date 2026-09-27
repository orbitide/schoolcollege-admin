"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, MinusIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  branchStore,
  classStore,
  groupStore,
  shiftStore,
  subjectStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { academicMediums, academicVersions, type Institute } from "@/lib/institutes"
import {
  addTermExam,
  classYearExamSubjects,
  dependentExamOptions,
  examMarkParts,
  isDuplicateExamName,
  parentExamOptions,
  updateTermExam,
  useTermExams,
  type TermExam,
  type TermExamInput,
  type TermExamSubject,
} from "@/lib/term-exams"
import { cn } from "@/lib/utils"

type Errors = Record<string, string | undefined>

type MarkKey =
  | (typeof examMarkParts)[number]["marks"]
  | (typeof examMarkParts)[number]["pass"]
  | "totalPassMarks"

const markKeys: MarkKey[] = [
  ...examMarkParts.flatMap((part) => [part.marks, part.pass]),
  "totalPassMarks",
]

// One subject of the class-year set; inputs stay strings until submit.
type SubjectRow = {
  subjectId: number
  // MCQ marks must be a multiple of this (0 when the set gives none).
  perMcq: number
  selected: boolean
} & Record<MarkKey, string>

const num = (value: string) => (value.trim() === "" ? 0 : Number(value))

function totalOf(row: SubjectRow) {
  return examMarkParts.reduce((sum, part) => sum + num(row[part.marks]), 0)
}

// The class-year subjects, with a saved exam's marks laid over them.
// A new exam starts with every subject selected.
function buildRows(
  instituteId: number,
  classId: string,
  yearId: string,
  medium: string,
  groupId: string,
  saved?: TermExamSubject[]
): SubjectRow[] {
  if (!classId || !yearId) return []
  const savedById = new Map(saved?.map((s) => [s.subjectId, s]))
  return classYearExamSubjects(
    instituteId,
    Number(classId),
    Number(yearId),
    medium,
    groupId ? Number(groupId) : null
  ).map(({ subject, perMcq }) => {
    const marks = savedById.get(subject.subjectId) ?? subject
    return {
      subjectId: subject.subjectId,
      perMcq,
      selected: saved ? savedById.has(subject.subjectId) : true,
      ...(Object.fromEntries(markKeys.map((key) => [key, String(marks[key])])) as Record<
        MarkKey,
        string
      >),
    }
  })
}

function addDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toLocaleDateString("en-CA")
}

// Legacy TermExam Create/Edit (also used to copy an exam): where the exam
// applies, its dates and result settings, and the class-year subjects it
// covers with their marks.
export function TermExamForm({
  examId,
  copyId,
  instituteId: defaultInstituteId,
  returnTo,
}: {
  examId?: number
  copyId?: number
  instituteId?: number
  returnTo?: string
}) {
  const exams = useTermExams()
  const existing = examId ? exams.find((e) => e.id === examId) : undefined
  const source = copyId ? exams.find((e) => e.id === copyId) : undefined
  const institutes = useAccessibleInstitutes()
  const listHref = returnTo?.startsWith("/") ? returnTo : "/term-exam"

  if ((examId && !existing) || (copyId && !source)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Term exam not found</h2>
        <p className="text-sm text-muted-foreground">It may have been deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>Back to term exams</Link>
        </Button>
      </div>
    )
  }

  const from = existing ?? source
  const initialInstitute =
    institutes.find((i) => i.id === (from?.instituteId ?? defaultInstituteId)) ??
    (institutes.length === 1 ? institutes[0] : undefined)

  return (
    <ExamForm
      // Remount when switching between exams so state starts fresh.
      key={`${examId ?? ""}:${copyId ?? ""}`}
      existing={existing}
      from={from}
      isCopy={Boolean(source)}
      institutes={institutes}
      initialInstitute={initialInstitute}
      listHref={listHref}
    />
  )
}

function ExamForm({
  existing,
  from,
  isCopy,
  institutes,
  initialInstitute,
  listHref,
}: {
  existing?: TermExam
  from?: TermExam
  isCopy: boolean
  institutes: Institute[]
  initialInstitute?: Institute
  listHref: string
}) {
  const router = useRouter()
  const user = useCurrentUser()
  const exams = useTermExams()
  const isNew = !existing

  const str = (value: number | null | undefined) => (value == null ? "" : String(value))
  const [instituteId, setInstituteId] = React.useState(str(initialInstitute?.id))
  const institute = institutes.find((i) => String(i.id) === instituteId)
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const branches = branchStore.useList(iid)
  const shifts = shiftStore.useList(iid)
  const groups = groupStore.useList(iid)
  const subjects = subjectStore.useList(iid)

  const [medium, setMedium] = React.useState(from?.medium ?? "")
  const [classId, setClassId] = React.useState(str(from?.classId))
  const [groupId, setGroupId] = React.useState(str(from?.groupId))
  const [yearId, setYearId] = React.useState(() => {
    if (from) return String(from.yearId)
    const current = yearStore.getList(iid).find((y) => y.isCurrent && y.status === "Active")
    return str(current?.id)
  })
  const [branchId, setBranchId] = React.useState(str(from?.branchId))
  const [version, setVersion] = React.useState(from?.version ?? "")
  const [shiftId, setShiftId] = React.useState(str(from?.shiftId))

  const [name, setName] = React.useState(from?.name ?? "")
  const [examStart, setExamStart] = React.useState(from?.examStart ?? addDays(0))
  const [examEnd, setExamEnd] = React.useState(from?.examEnd ?? addDays(15))
  const [resultPublish, setResultPublish] = React.useState(from?.resultPublish ?? addDays(18))
  const [parentExamId, setParentExamId] = React.useState(str(from?.parentExamId))
  const [totalWorkingDays, setTotalWorkingDays] = React.useState(String(from?.totalWorkingDays ?? 0))
  const [hasAttendanceMarks, setHasAttendanceMarks] = React.useState(from?.hasAttendanceMarks ?? false)
  const [attendanceMarks, setAttendanceMarks] = React.useState(String(from?.attendanceMarks ?? 0))
  const [hasAssignmentMarks, setHasAssignmentMarks] = React.useState(from?.hasAssignmentMarks ?? false)
  const [assignmentMarks, setAssignmentMarks] = React.useState(String(from?.assignmentMarks ?? 0))
  const [flags, setFlags] = React.useState({
    calculateGpa: from?.calculateGpa ?? true,
    multiPaperCalculation: from?.multiPaperCalculation ?? false,
    hasGraceMarks: from?.hasGraceMarks ?? false,
    parentExamWithoutOptional: from?.parentExamWithoutOptional ?? false,
    // A new or copied exam always starts editable and unpublished.
    editEnable: existing?.editEnable ?? true,
    onlinePublished: existing?.onlinePublished ?? false,
    showInYearBook: existing?.showInYearBook ?? false,
  })
  const [dependents, setDependents] = React.useState<string[]>(
    from?.dependentExamIds.map(String) ?? []
  )
  const [errors, setErrors] = React.useState<Errors>({})

  const selectedClass = classes.find((c) => String(c.id) === classId)
  const classGroups =
    institute?.enableGroup && selectedClass?.hasSubjectGroup
      ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
      : []
  const effectiveGroup = classGroups.some((g) => String(g.id) === groupId) ? groupId : ""
  const effectiveMedium = institute?.enableMedium ? medium : ""

  // Subject rows follow the class, year, medium and group; picking another
  // reloads them from that class-year subject set.
  const subjectKey = [iid, classId, yearId, effectiveMedium, effectiveGroup].join(":")
  const [rowState, setRowState] = React.useState(() => ({
    key: subjectKey,
    rows: buildRows(iid, classId, yearId, effectiveMedium, effectiveGroup, from?.subjects),
  }))
  if (rowState.key !== subjectKey) {
    setRowState({
      key: subjectKey,
      rows: buildRows(iid, classId, yearId, effectiveMedium, effectiveGroup),
    })
  }
  const rows = rowState.rows
  const setRows = (update: (rows: SubjectRow[]) => SubjectRow[]) =>
    setRowState((state) => ({ ...state, rows: update(state.rows) }))

  const structure = {
    instituteId: iid,
    medium: effectiveMedium,
    classId: Number(classId),
    groupId: effectiveGroup ? Number(effectiveGroup) : null,
    yearId: Number(yearId),
    branchId: institute?.enableBranch && branchId ? Number(branchId) : null,
    version: institute?.enableVersion ? version : "",
    shiftId: institute?.enableShift && shiftId ? Number(shiftId) : null,
  }
  const parentOptions = parentExamOptions(exams, structure, existing?.id)
  const effectiveParent = parentOptions.some((e) => String(e.id) === parentExamId) ? parentExamId : ""
  const config = institute?.configuration
  const showDependent = Boolean(config?.examShowDependent)
  const dependentOptions = classId
    ? dependentExamOptions(exams, iid, Number(classId), existing?.id)
    : []

  const subjectName = new Map(subjects.map((s) => [s.id, `${s.name} (${s.code})`]))
  const active = <T extends { id: number; status: string }>(list: T[], current: string) =>
    list.filter((item) => item.status === "Active" || String(item.id) === current)

  function changeInstitute(value: string) {
    setInstituteId(value)
    setMedium("")
    setClassId("")
    setGroupId("")
    setBranchId("")
    setVersion("")
    setShiftId("")
    const current = yearStore
      .getList(Number(value))
      .find((y) => y.isCurrent && y.status === "Active")
    setYearId(str(current?.id))
    setDependents([])
  }

  function updateRow(subjectId: number, patch: Partial<SubjectRow>) {
    setRows((current) =>
      current.map((row) => (row.subjectId === subjectId ? { ...row, ...patch } : row))
    )
  }

  function validate() {
    const next: Errors = {}
    if (!institute) next.instituteId = "Institute is required."
    if (institute?.enableMedium && !medium) next.medium = "Choose academic medium."
    if (!classId) next.classId = "Class is required."
    if (!yearId) next.yearId = "Academic year is required."
    if (!name.trim()) next.name = "Name is required."
    if (!examStart) next.examStart = "Exam start is required."
    if (!examEnd) next.examEnd = "Exam end is required."
    if (!resultPublish) next.resultPublish = "Result publish date is required."
    if (examStart && examEnd && examStart > examEnd) {
      next.examEnd = "Exam won't end before it starts."
    }
    if (resultPublish && examStart && resultPublish < examStart) {
      next.resultPublish = "Result won't be published before the exam starts."
    } else if (resultPublish && examEnd && resultPublish < examEnd) {
      next.resultPublish = "Result won't be published before the exam ends."
    }
    const days = Number(totalWorkingDays || 0)
    if (!Number.isInteger(days) || days < 0) next.totalWorkingDays = "Enter a whole number of 0 or more."
    if (hasAttendanceMarks && !(num(attendanceMarks) > 0)) {
      next.attendanceMarks = "Must be greater than 0 as attendance marks are on."
    }
    if (hasAssignmentMarks && !(num(assignmentMarks) > 0)) {
      next.assignmentMarks = "Must be greater than 0 as assignment marks are on."
    }
    if (!next.name && institute && classId && yearId) {
      if (isDuplicateExamName({ ...structure, name } as TermExamInput, existing?.id)) {
        next.name = "Another exam of this class and year already has this name."
      }
    }

    const selected = rows.filter((row) => row.selected)
    if (classId && yearId && !rows.length) {
      next.subjects = "No subject is assigned to this class for this year. Add them in Class Year Subjects first."
    } else if (rows.length && !selected.length) {
      next.subjects = "Select at least one subject for the exam."
    }
    for (const row of selected) {
      const at = (field: string) => `${row.subjectId}.${field}`
      for (const key of markKeys) {
        const value = num(row[key])
        if (Number.isNaN(value)) next[at(key)] = "Enter a number."
        else if (value < 0) next[at(key)] = "Can not be negative."
      }
      if (num(row.theoryMarks) > 0 && num(row.cqMarks) > 0) {
        next[at("cqMarks")] = "Only one of theory or CQ can be taken."
      }
      for (const part of examMarkParts) {
        if (!next[at(part.pass)] && num(row[part.pass]) > num(row[part.marks])) {
          next[at(part.pass)] = `More than the ${part.label} marks.`
        }
      }
      const mcq = num(row.mcqMarks)
      if (mcq > 0 && !next[at("mcqMarks")]) {
        if (row.perMcq <= 0) {
          next[at("mcqMarks")] = "Per-question MCQ marks aren't set in Class Year Subjects."
        } else if (Math.abs(mcq / row.perMcq - Math.round(mcq / row.perMcq)) > 1e-9) {
          next[at("mcqMarks")] = `Must be a multiple of ${row.perMcq} (marks per question).`
        }
      }
      const total = totalOf(row)
      if (!total) next[at("total")] = "Give the subject some marks."
      else if (!next[at("totalPassMarks")] && num(row.totalPassMarks) > total) {
        next[at("totalPassMarks")] = "More than the total marks."
      }
    }

    if (showDependent) {
      dependents.forEach((value, index) => {
        if (!value) next[`dependent.${index}`] = "Pick an exam or remove the row."
        else if (dependents.indexOf(value) !== index) next[`dependent.${index}`] = "Already listed."
      })
    }
    return next
  }

  function save(andNew: boolean) {
    const next = validate()
    setErrors(next)
    if (Object.values(next).some(Boolean)) {
      toast.error("Check the highlighted fields.")
      return
    }

    const yearName = years.find((y) => String(y.id) === yearId)?.name ?? ""
    const input: TermExamInput = {
      ...structure,
      name: name.trim(),
      fullName: `${name.trim()} - ${yearName}`,
      examStart,
      examEnd,
      resultPublish,
      parentExamId: effectiveParent ? Number(effectiveParent) : null,
      totalWorkingDays: Number(totalWorkingDays || 0),
      hasAttendanceMarks,
      attendanceMarks: hasAttendanceMarks ? num(attendanceMarks) : 0,
      hasAssignmentMarks,
      assignmentMarks: hasAssignmentMarks ? num(assignmentMarks) : 0,
      ...flags,
      subjects: rows
        .filter((row) => row.selected)
        .map((row) => ({
          subjectId: row.subjectId,
          ...(Object.fromEntries(markKeys.map((key) => [key, num(row[key])])) as Record<
            MarkKey,
            number
          >),
          totalMarks: totalOf(row),
        })),
      dependentExamIds: showDependent ? dependents.map(Number) : (from?.dependentExamIds ?? []),
    }

    if (existing) {
      updateTermExam(existing.id, input, user.name)
      toast.success("Term exam updated")
    } else {
      addTermExam(input, user.name)
      toast.success("Term exam added")
    }
    if (andNew) {
      // Keep where the exam applies; start the next one from a blank name.
      setName("")
      setParentExamId("")
      setErrors({})
      return
    }
    router.push(listHref)
  }

  const title = existing ? "Edit term exam" : isCopy ? "Copy term exam" : "Add term exam"
  const selectedCount = rows.filter((r) => r.selected).length
  const allSelected = rows.length > 0 && selectedCount === rows.length

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        save(false)
      }}
      noValidate
      className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6"
    >
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={listHref}>
          <ArrowLeftIcon data-icon="inline-start" />
          Term exams
        </Link>
      </Button>

      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {isCopy && from && (
          <p className="text-sm text-muted-foreground">
            Starting from {from.fullName}. Change where it applies or its name before saving.
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exam for</CardTitle>
          <CardDescription>
            The class and year sitting the exam. Leave branch, version or shift empty to cover
            all of them.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {institutes.length > 1 && (
            <FilterField
              label="Institute"
              required
              value={instituteId}
              onChange={changeInstitute}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
              error={errors.instituteId}
              disabled={!isNew}
            />
          )}
          {institute?.enableMedium && (
            <FilterField
              label="Medium"
              required
              value={medium}
              onChange={(v) => {
                setMedium(v)
                setClassId("")
              }}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              placeholder="Select medium"
              error={errors.medium}
            />
          )}
          <FilterField
            label="Class"
            required
            value={classId}
            onChange={(v) => {
              setClassId(v)
              setGroupId("")
              setDependents([])
            }}
            options={active(classes, classId)
              .filter((c) => !effectiveMedium || !c.medium || c.medium === effectiveMedium)
              .map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder={institute ? "Select class" : "Select institute first"}
            error={errors.classId}
            disabled={!institute}
          />
          <FilterField
            label="Academic year"
            required
            value={yearId}
            onChange={setYearId}
            options={active(years, yearId).map((y) => ({
              value: String(y.id),
              label: y.isCurrent ? `${y.name} (current)` : y.name,
            }))}
            placeholder={institute ? "Select academic year" : "Select institute first"}
            error={errors.yearId}
            disabled={!institute}
          />
          {classGroups.length > 0 && (
            <FilterField
              label="Academic group"
              value={effectiveGroup}
              onChange={setGroupId}
              options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
              allLabel="All groups"
            />
          )}
          {institute?.enableBranch && (
            <FilterField
              label="Branch"
              value={branchId}
              onChange={setBranchId}
              options={active(branches, branchId).map((b) => ({ value: String(b.id), label: b.name }))}
              allLabel="All branches"
            />
          )}
          {institute?.enableVersion && (
            <FilterField
              label="Version"
              value={version}
              onChange={setVersion}
              options={academicVersions.map((v) => ({ value: v, label: v }))}
              allLabel="All versions"
            />
          )}
          {institute?.enableShift && (
            <FilterField
              label="Shift"
              value={shiftId}
              onChange={setShiftId}
              options={active(shifts, shiftId).map((s) => ({ value: String(s.id), label: s.name }))}
              allLabel="All shifts"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exam</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TextField
            id="name"
            label="Name"
            required
            value={name}
            onChange={setName}
            placeholder="e.g. Half Yearly"
            error={errors.name}
            className="sm:col-span-2"
          />
          <FilterField
            label="Parent term exam"
            value={effectiveParent}
            onChange={setParentExamId}
            options={parentOptions.map((e) => ({ value: String(e.id), label: e.name }))}
            allLabel="None"
          />
          <TextField
            id="totalWorkingDays"
            label="Total working days"
            type="number"
            value={totalWorkingDays}
            onChange={setTotalWorkingDays}
            error={errors.totalWorkingDays}
          />
          <TextField
            id="examStart"
            label="Exam start"
            required
            type="date"
            value={examStart}
            onChange={setExamStart}
            error={errors.examStart}
          />
          <TextField
            id="examEnd"
            label="Exam end"
            required
            type="date"
            value={examEnd}
            onChange={setExamEnd}
            error={errors.examEnd}
          />
          <TextField
            id="resultPublish"
            label="Result publish"
            required
            type="date"
            value={resultPublish}
            onChange={setResultPublish}
            error={errors.resultPublish}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marks and results</CardTitle>
          {isNew && (
            <CardDescription>
              A new exam starts editable, unpublished and out of the year book; change those
              after saving.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {(config?.examShowAttendance || config?.examShowAssignment) && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {config?.examShowAttendance && (
                <ToggleNumber
                  id="attendance"
                  label="Has attendance marks"
                  checked={hasAttendanceMarks}
                  onCheckedChange={setHasAttendanceMarks}
                  value={attendanceMarks}
                  onChange={setAttendanceMarks}
                  valueLabel="Attendance marks"
                  error={errors.attendanceMarks}
                />
              )}
              {config?.examShowAssignment && (
                <ToggleNumber
                  id="assignment"
                  label="Has assignment marks"
                  checked={hasAssignmentMarks}
                  onCheckedChange={setHasAssignmentMarks}
                  value={assignmentMarks}
                  onChange={setAssignmentMarks}
                  valueLabel="Assignment marks"
                  error={errors.assignmentMarks}
                />
              )}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["calculateGpa", "Calculate GPA"],
                ["multiPaperCalculation", "Multi paper calculation"],
                ["hasGraceMarks", "Has grace marks"],
                ["parentExamWithoutOptional", "Parent exam without optional"],
                ...(isNew
                  ? []
                  : ([
                      ["editEnable", "Edit enable"],
                      ["onlinePublished", "Online published"],
                      ["showInYearBook", "Show in year book"],
                    ] as const)),
              ] as const
            ).map(([key, label]) => (
              <Field key={key} orientation="horizontal">
                <Checkbox
                  id={key}
                  checked={flags[key]}
                  onCheckedChange={(checked) =>
                    setFlags((current) => ({ ...current, [key]: checked === true }))
                  }
                />
                <FieldLabel htmlFor={key} className="font-normal">
                  {label}
                </FieldLabel>
              </Field>
            ))}
          </div>
        </CardContent>
      </Card>

      {showDependent && (
        <Card>
          <CardHeader className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-col gap-1.5">
              <CardTitle>Dependent exams</CardTitle>
              <CardDescription>Other exams of this class that this one depends on.</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!classId || dependents.length >= dependentOptions.length}
              onClick={() => setDependents((current) => [...current, ""])}
            >
              <PlusIcon data-icon="inline-start" />
              Add exam
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {dependents.length === 0 && (
              <p className="text-sm text-muted-foreground">No dependent exams.</p>
            )}
            {dependents.map((value, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-1">
                  <FilterField
                    label={`Dependent exam ${index + 1}`}
                    value={value}
                    onChange={(v) =>
                      setDependents((current) => current.map((d, i) => (i === index ? v : d)))
                    }
                    options={dependentOptions
                      .filter((e) => String(e.id) === value || !dependents.includes(String(e.id)))
                      .map((e) => ({ value: String(e.id), label: e.fullName }))}
                    placeholder="Select dependent exam"
                    error={errors[`dependent.${index}`]}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-6 text-muted-foreground"
                  onClick={() => setDependents((current) => current.filter((_, i) => i !== index))}
                >
                  <MinusIcon />
                  <span className="sr-only">Remove dependent exam</span>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Exam subjects</CardTitle>
            <CardDescription>
              {rows.length
                ? `${selectedCount} of ${rows.length} subjects selected. Marks start from the class-year subject set; the total is the sum of the parts.`
                : "Pick the class and academic year to load its subjects."}
            </CardDescription>
          </div>
          {rows.length > 0 && <ApplyDefault rows={rows} setRows={setRows} />}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {errors.subjects && <p className="text-sm text-destructive">{errors.subjects}</p>}
          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead rowSpan={2} className="w-10">
                      <Checkbox
                        aria-label="Select all subjects"
                        checked={allSelected ? true : selectedCount ? "indeterminate" : false}
                        onCheckedChange={(checked) =>
                          setRows((current) =>
                            current.map((row) => ({ ...row, selected: checked === true }))
                          )
                        }
                      />
                    </TableHead>
                    <TableHead rowSpan={2}>Subject</TableHead>
                    {examMarkParts.map((part) => (
                      <TableHead key={part.label} colSpan={2} className="border-l text-center">
                        {part.label}
                      </TableHead>
                    ))}
                    <TableHead rowSpan={2} className="border-l text-center">
                      Total
                    </TableHead>
                    <TableHead rowSpan={2} className="text-center">
                      Total pass
                    </TableHead>
                  </TableRow>
                  <TableRow>
                    {examMarkParts.map((part) => (
                      <React.Fragment key={part.label}>
                        <TableHead className="border-l text-center text-xs font-normal">Marks</TableHead>
                        <TableHead className="text-center text-xs font-normal">Pass</TableHead>
                      </React.Fragment>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const at = (field: string) => errors[`${row.subjectId}.${field}`]
                    const total = totalOf(row)
                    return (
                      <TableRow
                        key={row.subjectId}
                        data-state={row.selected ? "selected" : undefined}
                        className={cn(!row.selected && "text-muted-foreground")}
                      >
                        <TableCell className="align-top">
                          <Checkbox
                            aria-label={`Select ${subjectName.get(row.subjectId) ?? "subject"}`}
                            checked={row.selected}
                            onCheckedChange={(checked) =>
                              updateRow(row.subjectId, { selected: checked === true })
                            }
                          />
                        </TableCell>
                        <TableCell className="min-w-44 align-top font-medium whitespace-normal">
                          {subjectName.get(row.subjectId) ?? `Subject #${row.subjectId}`}
                          {row.perMcq > 0 && num(row.mcqMarks) > 0 && (
                            <div className="text-xs font-normal text-muted-foreground">
                              {row.perMcq} mark{row.perMcq === 1 ? "" : "s"} per MCQ
                            </div>
                          )}
                        </TableCell>
                        {examMarkParts.flatMap((part) =>
                          [part.marks, part.pass].map((key, i) => (
                            <TableCell key={key} className={cn("align-top", i === 0 && "border-l")}>
                              <MarkInput
                                label={`${part.label} ${i === 0 ? "marks" : "pass marks"}`}
                                value={row[key]}
                                disabled={!row.selected}
                                error={at(key)}
                                onChange={(value) => updateRow(row.subjectId, { [key]: value })}
                              />
                            </TableCell>
                          ))
                        )}
                        <TableCell className="border-l text-center align-top">
                          <div className="flex h-8 items-center justify-center font-semibold tabular-nums">
                            {Number.isNaN(total) ? "—" : total}
                          </div>
                          {at("total") && (
                            <p className="w-24 text-xs text-destructive">{at("total")}</p>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <MarkInput
                            label="Total pass marks"
                            value={row.totalPassMarks}
                            disabled={!row.selected}
                            error={at("totalPassMarks")}
                            onChange={(value) => updateRow(row.subjectId, { totalPassMarks: value })}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background px-4 py-3 lg:-mx-6 lg:px-6">
        <Button asChild variant="outline">
          <Link href={listHref}>Cancel</Link>
        </Button>
        {isNew && (
          <Button type="button" variant="secondary" onClick={() => save(true)}>
            Save and new
          </Button>
        )}
        <Button type="submit">{isNew ? "Save" : "Update"}</Button>
      </div>
    </form>
  )
}

// The legacy "Show Default" row: set one mark column on every selected subject.
function ApplyDefault({
  rows,
  setRows,
}: {
  rows: SubjectRow[]
  setRows: (update: (rows: SubjectRow[]) => SubjectRow[]) => void
}) {
  const [column, setColumn] = React.useState<MarkKey>("theoryMarks")
  const [value, setValue] = React.useState("")
  const columns = [
    ...examMarkParts.flatMap((part) => [
      { value: part.marks, label: `${part.label} marks` },
      { value: part.pass, label: `${part.label} pass marks` },
    ]),
    { value: "totalPassMarks", label: "Total pass marks" },
  ]
  const selected = rows.filter((row) => row.selected).length
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-48">
        <FilterField
          label="Set for selected"
          value={column}
          onChange={(v) => setColumn(v as MarkKey)}
          options={columns}
        />
      </div>
      <Input
        type="number"
        min={0}
        step="0.01"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label="Value"
        placeholder="Value"
        className="w-24"
      />
      <Button
        type="button"
        variant="outline"
        disabled={!selected || value.trim() === "" || Number(value) < 0}
        onClick={() => {
          setRows((current) =>
            current.map((row) => (row.selected ? { ...row, [column]: value } : row))
          )
          toast.success(`Set on ${selected} subject${selected === 1 ? "" : "s"}`)
        }}
      >
        Apply
      </Button>
    </div>
  )
}

function TextField({
  id,
  label,
  required,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  className,
}: {
  id: string
  label: string
  required?: boolean
  type?: "text" | "number" | "date"
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  className?: string
}) {
  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </FieldLabel>
      <Input
        id={id}
        type={type}
        min={type === "number" ? 0 : undefined}
        value={value}
        placeholder={placeholder}
        aria-invalid={!!error}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function ToggleNumber({
  id,
  label,
  checked,
  onCheckedChange,
  value,
  onChange,
  valueLabel,
  error,
}: {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  value: string
  onChange: (value: string) => void
  valueLabel: string
  error?: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <Field orientation="horizontal">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(next) => onCheckedChange(next === true)}
        />
        <FieldLabel htmlFor={id} className="font-normal">
          {label}
        </FieldLabel>
      </Field>
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor={`${id}-marks`} className="text-xs font-normal text-muted-foreground">
          {valueLabel}
        </FieldLabel>
        <Input
          id={`${id}-marks`}
          type="number"
          min={0}
          step="0.01"
          value={value}
          disabled={!checked}
          aria-invalid={!!error}
          onChange={(event) => onChange(event.target.value)}
          className="h-8"
        />
        <FieldError className="text-xs">{error}</FieldError>
      </Field>
    </div>
  )
}

function MarkInput({
  label,
  value,
  disabled,
  error,
  onChange,
}: {
  label: string
  value: string
  disabled?: boolean
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex w-20 flex-col gap-1">
      <Input
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-invalid={!!error}
        onFocus={(event) => event.target.select()}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 text-center"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
