"use client"

import * as React from "react"

import { holidayStore } from "@/lib/holidays"
import { seedInstitutes, type HolidayEvent, type Institute } from "@/lib/institutes"
import { fitsPlace, getStudents, type Enrolment, type EnrolmentPlace, type Student } from "@/lib/students"
import { getTeachers, type Teacher } from "@/lib/teachers"

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
// weekend or an active holiday for the class (and its medium). Legacy lets
// attendance be taken anyway, so this only warns.
export function dayOffNote(
  institute: Institute,
  holidays: HolidayEvent[],
  date: string,
  medium = "",
  classId?: number
) {
  const weekday = weekdayOf(date)
  if (isWeekend(institute, date)) {
    return `${weekday} is a weekend for this institute.`
  }
  const holiday = holidayOn(institute, holidays, date, medium, classId)
  return holiday ? `${holiday.name} (${holiday.type.toLowerCase()} holiday) falls on this day.` : undefined
}

export function isWeekend(institute: Institute, date: string) {
  return (institute.weekend as string[]).includes(weekdayOf(date))
}

// The institute's active holiday on the date for the medium and class, if
// any. One for a single medium or class only counts when that one (or none)
// is asked about.
export function holidayOn(
  institute: Institute,
  holidays: HolidayEvent[],
  date: string,
  medium = "",
  classId?: number
) {
  const monthDay = date.slice(5)
  return holidays.find((h) => {
    if (h.instituteId !== institute.id || h.status !== "Active") return false
    if (h.medium && medium && h.medium !== medium) return false
    if (h.classId != null && classId != null && h.classId !== classId) return false
    const end = h.endDate || h.startDate
    if (h.repetition === "Once") return h.startDate <= date && date <= end
    // Yearly: compare month and day, allowing a range across New Year.
    const from = h.startDate.slice(5)
    const to = end.slice(5)
    return from <= to ? from <= monthDay && monthDay <= to : monthDay >= from || monthDay <= to
  })
}

// ---- Seed ----
// Made-up but stable attendance for institute 1's current-year students on
// every school day of 2026 up to today — skipping the institute's weekend
// and holidays — taken by the section's teacher, so the sheets, the
// teacher's page, fines and reports have data. A few students miss school
// far more often, so fines have someone to catch. Today only the odd
// sections are taken yet, leaving Take Attendance something to do.

function hash(...values: number[]) {
  let h = 2166136261
  for (const v of values) {
    h ^= v
    h = Math.imul(h, 16777619)
  }
  // Final mix (murmur3 fmix32), so neighbouring days don't give near-equal
  // values and absences spread out instead of clustering.
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967295
}

const seedUser = "Super Admin"

// How likely the seeded student is to be absent on a school day.
function absenceRate(studentId: number) {
  if (studentId % 7 === 3) return 0.2
  if (studentId % 5 === 1) return 0.1
  return 0.04
}

function seedAttendance(): StudentAttendance[] {
  const institute = seedInstitutes.find((i) => i.id === 1)
  if (!institute) return []
  const holidays = holidayStore.getList(institute.id)
  const today = todayIso()
  // The first active teacher taking each section this year.
  const teacherOf = new Map<number, Teacher>()
  for (const teacher of getTeachers()) {
    if (teacher.status !== "Active") continue
    for (const s of teacher.sections) {
      if (s.yearId === 2 && !teacherOf.has(s.sectionId)) teacherOf.set(s.sectionId, teacher)
    }
  }
  const pupils = getStudents().flatMap((student) => {
    const enrolment = student.enrolments.find((e) => e.yearId === 2)
    return student.instituteId === institute.id && student.status === "Active" && enrolment?.sectionId
      ? [{ student, sectionId: enrolment.sectionId }]
      : []
  })

  const records: StudentAttendance[] = []
  for (let day = new Date(2026, 0, 1), n = 0; ; day.setDate(day.getDate() + 1), n++) {
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
    if (date > today) break
    if (dayOffNote(institute, holidays, date)) continue
    for (const { student, sectionId } of pupils) {
      if (date === today && sectionId % 2 === 0) continue
      const teacher = teacherOf.get(sectionId)
      const by = teacher?.name ?? seedUser
      const at = `${date}T09:${String(5 + ((sectionId * 7) % 50)).padStart(2, "0")}:00`
      records.push({
        id: records.length + 1,
        instituteId: institute.id,
        sectionId,
        studentId: student.id,
        teacherId: teacher?.id ?? null,
        date,
        isPresent: hash(student.id, n) >= absenceRate(student.id),
        createdBy: by,
        createdAt: at,
        modifiedBy: by,
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
