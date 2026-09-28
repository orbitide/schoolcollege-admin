import type { HolidayEvent, Institute } from "@/lib/institutes"
import type { SmsMessage } from "@/lib/sms-messages"
import { holidayOn, isWeekend, type StudentAttendance } from "@/lib/student-attendance"
import type { Enrolment, Student } from "@/lib/students"

// Legacy RptAttendance/StudentAttendanceReport ("Student's Individual
// Attendance Report"): one student's attendance day by day over a date
// range — present or absent where it was taken, otherwise a holiday, a
// weekend or "N/A" — with the attendance SMS sent and the totals.

// Legacy firstPageCount: days on each printed page.
export const DAYS_PER_PAGE = 32
// A year of days at most, so a slip in the range can't list decades.
export const MAX_DAYS = 366

export type DayStatus = "Present" | "Absent" | "Holiday" | "Weekend" | "N/A"

export type AttendanceDay = { date: string; status: DayStatus; smsCount: number }

export type StudentAttendanceReport = {
  days: AttendanceDay[]
  totals: {
    // Legacy: the days neither a holiday nor a weekend (present, absent, N/A).
    workingDays: number
    present: number
    absent: number
    holidays: number
    weekends: number
    sms: number
  }
}

// The student of the class and year with the roll (legacy GetStudentRoll).
export function findStudentByRoll(
  institute: Institute,
  students: Student[],
  filter: { classId: number; yearId: number; branchId: number | null; medium: string; roll: string }
): { student: Student; enrolment: Enrolment } | undefined {
  for (const student of students) {
    if (student.instituteId !== institute.id || student.status !== "Active") continue
    const enrolment = student.enrolments.find(
      (e) =>
        e.classId === filter.classId &&
        e.yearId === filter.yearId &&
        (filter.branchId == null || e.branchId === filter.branchId) &&
        (!filter.medium || e.medium === filter.medium) &&
        e.classRoll.trim() === filter.roll
    )
    if (enrolment) return { student, enrolment }
  }
  return undefined
}

// Each ISO day from `from` to `to`, inclusive (at most MAX_DAYS).
export function daysBetween(from: string, to: string) {
  const days: string[] = []
  const d = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  const pad = (n: number) => String(n).padStart(2, "0")
  while (d <= end && days.length < MAX_DAYS) {
    days.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
    d.setDate(d.getDate() + 1)
  }
  return days
}

export function studentAttendanceReport(
  institute: Institute,
  student: Student,
  enrolment: Enrolment,
  data: { attendance: StudentAttendance[]; sms: SmsMessage[]; holidays: HolidayEvent[] },
  from: string,
  to: string
): StudentAttendanceReport {
  const taken = new Map(
    data.attendance.filter((a) => a.studentId === student.id).map((a) => [a.date, a.isPresent])
  )
  const smsOn = new Map<string, number>()
  for (const m of data.sms) {
    if (m.studentId !== student.id || m.smsType !== "Attendance" || !m.attendanceDate || m.status === "Failed") continue
    smsOn.set(m.attendanceDate, (smsOn.get(m.attendanceDate) ?? 0) + 1)
  }

  // Legacy order: the attendance taken, then a holiday, then a weekend.
  const days = daysBetween(from, to).map((date): AttendanceDay => {
    const present = taken.get(date)
    const status: DayStatus =
      present === true
        ? "Present"
        : present === false
          ? "Absent"
          : holidayOn(institute, data.holidays, date, enrolment.medium, enrolment.classId)
            ? "Holiday"
            : isWeekend(institute, date)
              ? "Weekend"
              : "N/A"
    return { date, status, smsCount: smsOn.get(date) ?? 0 }
  })
  const count = (s: DayStatus) => days.filter((d) => d.status === s).length
  return {
    days,
    totals: {
      workingDays: count("Present") + count("Absent") + count("N/A"),
      present: count("Present"),
      absent: count("Absent"),
      holidays: count("Holiday"),
      weekends: count("Weekend"),
      sms: days.reduce((sum, d) => sum + d.smsCount, 0),
    },
  }
}
