"use client"

import { Input } from "@/components/ui/input"
import {
  markTotal,
  type MarkEdit,
  type TermExamStudentMark,
} from "@/lib/term-exam-marks"
import { cn } from "@/lib/utils"

// Form state shared by Edit Student Marks and Subject Marks Edit: one
// subject's editable marks as the inputs hold them.

export type EditField = Exclude<keyof MarkEdit, "subjectId">
export type MarkForm = Record<EditField, string>

// A mark as the form has it, for live totals and colours.
export type LiveMark = Omit<MarkEdit, "subjectId"> &
  Pick<TermExamStudentMark, "mcqMarks" | "totalMarks"> & { uploaded: boolean }

export const editFields: EditField[] = [
  "theoryMarks",
  "theoryGraceMarks",
  "cqMarks",
  "cqGraceMarks",
  "mcqGraceMarks",
  "practicalMarks",
  "assignmentMarks",
  "attendanceMarks",
]

const isGrace = (f: EditField) => f.endsWith("GraceMarks")

// A saved mark as form values; zero grace marks show as empty.
export function markForm(mark: TermExamStudentMark | undefined): MarkForm {
  return Object.fromEntries(
    editFields.map((f) => {
      const value = mark?.[f]
      return [f, value == null || (isGrace(f) && value === 0) ? "" : String(value)]
    })
  ) as MarkForm
}

// "" is "not entered"; anything else must be a number.
export const parseMark = (value: string) => (value.trim() === "" ? null : Number(value))

const numberOrNull = (value: string) => {
  const n = parseMark(value)
  return n == null || Number.isNaN(n) ? null : n
}

export function liveMark(form: MarkForm, saved: TermExamStudentMark | undefined): LiveMark {
  const m = {
    theoryMarks: numberOrNull(form.theoryMarks),
    cqMarks: numberOrNull(form.cqMarks),
    mcqMarks: saved?.mcqMarks ?? null,
    practicalMarks: numberOrNull(form.practicalMarks),
    assignmentMarks: numberOrNull(form.assignmentMarks),
    attendanceMarks: numberOrNull(form.attendanceMarks),
    theoryGraceMarks: numberOrNull(form.theoryGraceMarks) ?? 0,
    cqGraceMarks: numberOrNull(form.cqGraceMarks) ?? 0,
    mcqGraceMarks: numberOrNull(form.mcqGraceMarks) ?? 0,
  }
  return { ...m, totalMarks: markTotal(m), uploaded: !!saved }
}

// The form as a MarkEdit, plus the keys of fields that aren't valid marks.
export function readMarkForm(form: MarkForm, subjectId: number, editable: (keyof MarkEdit)[]) {
  const edit = { subjectId } as MarkEdit
  const invalid: EditField[] = []
  for (const f of editFields) {
    const value = parseMark(form[f])
    if (editable.includes(f) && value != null && (Number.isNaN(value) || value < 0)) invalid.push(f)
    ;(edit as Record<string, unknown>)[f] = isGrace(f) ? (value ?? 0) : value
  }
  return { edit, invalid }
}

export function MarkInput({
  label,
  value,
  full,
  low,
  error,
  onChange,
}: {
  label: string
  value: string
  full: number
  low: boolean
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <Input
      type="number"
      min={0}
      step="any"
      max={full || undefined}
      title={error ?? (full ? `Out of ${full}` : undefined)}
      aria-label={label}
      aria-invalid={!!error}
      className={cn("mx-auto h-8 w-20 text-center", low && "text-destructive")}
      value={value}
      onFocus={(e) => e.target.select()}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
