"use client"

import * as React from "react"

import type { HolidayEvent, Institute } from "@/lib/institutes"
import { fitsPlace, getStudents, type Enrolment, type EnrolmentPlace, type Student } from "@/lib/students"

// Legacy SchoolCollege StudentAttendance: whether one student of a section
// was present on a day. One record per student, section and date; taking
// attendance again for the day updates it. In-memory dummy store for the
// browser session; replace with API calls once the backend endpoints exist.

export type StudentAttendance = {
  id: number
  instituteId: number
  sectionId: number
  studentId: number
  // Who took it when a teacher did; null when taken by an admin.
  teacherId: number | null
  // ISO "YYYY-MM-DD".
  date: string
  isPresent: boolean
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

// Today as ISO "YYYY-MM-DD" in local time; attendance can't be taken ahead.
export function todayIso() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

const jsWeekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function weekdayOf(date: string) {
  return jsWeekdays[parseIsoDate(date).getDay()]
}

// Why the institute would normally be closed on the date, if it would: a
// weekend or an active holiday for the class's medium. Legacy lets
// attendance be taken anyway, so this only warns.
export function dayOffNote(
  institute: Institute,
  holidays: HolidayEvent[],
  date: string,
  medium = ""
) {
  const weekday = weekdayOf(date)
  if ((institute.weekend as string[]).includes(weekday)) {
    return `${weekday} is a weekend for this institute.`
  }
  const monthDay = date.slice(5)
  const holiday = holidays.find((h) => {
    if (h.instituteId !== institute.id || h.status !== "Active") return false
    if (h.medium && medium && h.medium !== medium) return false
    const end = h.endDate || h.startDate
    if (h.repetition === "Once") return h.startDate <= date && date <= end
    // Yearly: compare month and day, allowing a range across New Year.
    const from = h.startDate.slice(5)
    const to = end.slice(5)
    return from <= to ? from <= monthDay && monthDay <= to : monthDay >= from || monthDay <= to
  })
  return holiday ? `${holiday.name} (${holiday.type.toLowerCase()} holiday) falls on this day.` : undefined
}

// ---- Seed ----
// Made-up but stable attendance for institute 1's current-year students
// over the school days of September 2026 so far, so the sheet and later
// reports have something to show.

function hash(...values: number[]) {
  let h = 2166136261
  for (const v of values) {
    h ^= v
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

const seedUser = "Super Admin"

function seedAttendance(): StudentAttendance[] {
  const records: StudentAttendance[] = []
  for (let day = 1; day <= 24; day++) {
    const date = `2026-09-${String(day).padStart(2, "0")}`
    if (weekdayOf(date) === "Friday") continue
    for (const student of getStudents()) {
      if (student.instituteId !== 1 || student.status !== "Active") continue
      const enrolment = student.enrolments.find((e) => e.yearId === 2)
      if (!enrolment?.sectionId) continue
      const at = `${date}T09:${String(10 + (enrolment.sectionId % 40)).padStart(2, "0")}:00`
      records.push({
        id: records.length + 1,
        instituteId: 1,
        sectionId: enrolment.sectionId,
        studentId: student.id,
        teacherId: null,
        date,
        isPresent: hash(student.id, day) > 0.09,
        createdBy: seedUser,
        createdAt: at,
        modifiedBy: seedUser,
        modifiedAt: at,
      })
    }
  }
  return records
}

const seed = seedAttendance()

// ---- Store ----

let attendance: StudentAttendance[] = seed
const listeners = new Set<() => void>()

function emit(next: StudentAttendance[]) {
  attendance = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getStudentAttendance() {
  return attendance
}

export function useStudentAttendance() {
  return React.useSyncExternalStore(
    subscribe,
    () => attendance,
    () => seed
  )
}

export type AttendanceRow = {
  student: Student
  enrolment: Enrolment
  // The record already taken for the day, if any.
  record?: StudentAttendance
}

// Legacy LoadStudentAttendanceDetails: the section's active students in
// roll order, each with the day's record when attendance was already taken.
export function attendanceSheet(
  students: Student[],
  records: StudentAttendance[],
  instituteId: number,
  place: EnrolmentPlace,
  date: string
): AttendanceRow[] {
  const taken = new Map(
    records
      .filter((r) => r.sectionId === place.sectionId && r.date === date)
      .map((r) => [r.studentId, r])
  )
  return students
    .flatMap((student) => {
      if (student.instituteId !== instituteId || student.status !== "Active") return []
      const enrolment = student.enrolments.find((e) => fitsPlace(e, place))
      return enrolment ? [{ student, enrolment, record: taken.get(student.id) }] : []
    })
    .sort((a, b) =>
      a.enrolment.classRoll.localeCompare(b.enrolment.classRoll, undefined, { numeric: true })
    )
}

export type AttendanceEntry = { studentId: number; isPresent: boolean }

// Legacy StudentAttendanceService.SaveByAdmin: adds a record for each
// student without one for the day and updates those whose presence
// changed. Returns how many were added and updated.
export function saveAttendance(
  input: {
    instituteId: number
    sectionId: number
    date: string
    teacherId?: number | null
    entries: AttendanceEntry[]
  },
  user: string
) {
  if (!input.entries.length) throw new Error("There are no students to take attendance for.")
  if (!input.date) throw new Error("Date is required.")
  if (input.date > todayIso()) throw new Error("Attendance can't be taken for a future date.")

  const now = new Date().toISOString().slice(0, 19)
  const existing = new Map(
    attendance
      .filter((r) => r.sectionId === input.sectionId && r.date === input.date)
      .map((r) => [r.studentId, r])
  )
  let nextId = Math.max(0, ...attendance.map((r) => r.id)) + 1
  let added = 0
  let updated = 0
  const changed = new Map<number, StudentAttendance>()
  const fresh: StudentAttendance[] = []

  for (const entry of input.entries) {
    const old = existing.get(entry.studentId)
    if (!old) {
      fresh.push({
        id: nextId++,
        instituteId: input.instituteId,
        sectionId: input.sectionId,
        studentId: entry.studentId,
        teacherId: input.teacherId ?? null,
        date: input.date,
        isPresent: entry.isPresent,
        createdBy: user,
        createdAt: now,
        modifiedBy: user,
        modifiedAt: now,
      })
      added++
    } else if (old.isPresent !== entry.isPresent) {
      changed.set(old.id, {
        ...old,
        isPresent: entry.isPresent,
        // A teacher correcting the day becomes who took it.
        teacherId: input.teacherId ?? old.teacherId,
        modifiedBy: user,
        modifiedAt: now,
      })
      updated++
    }
  }

  if (added || updated) emit([...attendance.map((r) => changed.get(r.id) ?? r), ...fresh])
  return { added, updated }
}

// Legacy ResetStudentAttendance: clears what was saved for the section on
// the day so it can be taken afresh. Legacy scoped a teacher's reset to the
// rows they took; here a section can have several teachers, so the whole
// day goes rather than leaving it half taken. Returns how many were removed.
export function resetAttendance(input: { sectionId: number; date: string }) {
  const keep = attendance.filter((r) => !(r.sectionId === input.sectionId && r.date === input.date))
  const removed = attendance.length - keep.length
  if (removed) emit(keep)
  return removed
}
