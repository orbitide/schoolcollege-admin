import type { HolidayEvent, Institute } from "@/lib/institutes"
import type { SmsMessage } from "@/lib/sms-messages"
import { dayOffNote, type StudentAttendance } from "@/lib/student-attendance"
import type { Enrolment, Student } from "@/lib/students"

// Legacy RptAttendance/DailyAttendanceReport (StudentAttendanceRepository.
// LoadDateWiseStudentAttandance): the students of a year — narrowed by
// branch, medium, class, group, version, shift, section and roll — with
// whether they were present on a day ("N/A" when attendance wasn't taken)
// and how many attendance SMS they were sent about it.

export const attendanceStatuses = [
  { value: "all", label: "All" },
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
] as const
export type AttendanceStatusFilter = (typeof attendanceStatuses)[number]["value"]

export type DailyAttendanceRow = {
  student: Student
  enrolment: Enrolment
  // null when attendance wasn't taken for the student that day.
  isPresent: boolean | null
  smsCount: number
}

export type DailyAttendanceReport = {
  rows: DailyAttendanceRow[]
  totals: { students: number; present: number; absent: number; sms: number }
  // "Weekend" / "Holiday" note when the day is off and nobody was present.
  dayOff: string | null
}

export type DailyAttendanceFilter = {
  date: string
  yearId: number
  branchId: number | null
  medium: string
  classId: number | null
  groupId: number | null
  version: string
  shiftId: number | null
  sectionId: number | null
  roll: string
  status: AttendanceStatusFilter
}

export function dailyAttendanceReport(
  institute: Institute,
  data: {
    students: Student[]
    attendance: StudentAttendance[]
    sms: SmsMessage[]
    holidays: HolidayEvent[]
    classRank: Map<number, number>
    sectionRank: Map<number, number>
  },
  filter: DailyAttendanceFilter
): DailyAttendanceReport {
  const taken = new Map(
    data.attendance
      .filter((a) => a.instituteId === institute.id && a.date === filter.date)
      .map((a) => [a.studentId, a.isPresent])
  )
  const smsCount = new Map<number, number>()
  for (const m of data.sms) {
    if (m.instituteId !== institute.id || m.studentId == null) continue
    if (m.smsType !== "Attendance" || m.attendanceDate !== filter.date || m.status === "Failed") continue
    smsCount.set(m.studentId, (smsCount.get(m.studentId) ?? 0) + 1)
  }

  let rows = data.students.flatMap((student): DailyAttendanceRow[] => {
    if (student.instituteId !== institute.id || student.status !== "Active") return []
    const e = student.enrolments.find(
      (en) =>
        en.yearId === filter.yearId &&
        (filter.branchId == null || en.branchId === filter.branchId) &&
        (!filter.medium || en.medium === filter.medium) &&
        (filter.classId == null || en.classId === filter.classId) &&
        (filter.groupId == null || en.groupId === filter.groupId) &&
        (!filter.version || en.version === filter.version) &&
        (filter.shiftId == null || en.shiftId === filter.shiftId) &&
        (filter.sectionId == null || en.sectionId === filter.sectionId) &&
        (!filter.roll || en.classRoll.trim() === filter.roll)
    )
    // The legacy joins on the section.
    if (!e || e.sectionId == null) return []
    return [{ student, enrolment: e, isPresent: taken.get(student.id) ?? null, smsCount: smsCount.get(student.id) ?? 0 }]
  })

  // Legacy: on a weekend or holiday nobody attended, there's no report;
  // on one some did, only those whose attendance was taken are listed.
  const offNote = dayOffNote(institute, data.holidays, filter.date, filter.medium)
  const anyPresent = rows.some((r) => r.isPresent)
  if (offNote && rows.length && !anyPresent) {
    return { rows: [], totals: { students: 0, present: 0, absent: 0, sms: 0 }, dayOff: offNote }
  }
  if (offNote) rows = rows.filter((r) => r.isPresent != null)

  const totals = {
    students: rows.length,
    present: rows.filter((r) => r.isPresent === true).length,
    absent: rows.filter((r) => r.isPresent === false).length,
    sms: rows.reduce((sum, r) => sum + r.smsCount, 0),
  }
  if (filter.status !== "all") rows = rows.filter((r) => r.isPresent === (filter.status === "present"))

  const rank = (map: Map<number, number>, id: number | null) => (id == null ? 1e9 : (map.get(id) ?? 1e9 - 1))
  rows.sort(
    (a, b) =>
      rank(data.classRank, a.enrolment.classId) - rank(data.classRank, b.enrolment.classId) ||
      rank(data.sectionRank, a.enrolment.sectionId) - rank(data.sectionRank, b.enrolment.sectionId) ||
      a.enrolment.classRoll.localeCompare(b.enrolment.classRoll, undefined, { numeric: true })
  )
  return { rows, totals, dayOff: null }
}
