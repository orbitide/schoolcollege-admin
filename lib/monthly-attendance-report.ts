import type { HolidayEvent, Institute } from "@/lib/institutes"
import type { SmsMessage } from "@/lib/sms-messages"
import { holidayOn, isWeekend, type StudentAttendance } from "@/lib/student-attendance"
import { daysBetween } from "@/lib/student-attendance-report"
import type { Enrolment, Student } from "@/lib/students"

// Legacy RptAttendance/MonthlyAttendanceReport (StudentAttendanceRepository.
// LoadMonthlyAttendanceReportDtoList, Partial/_monthlyAttendanceReport): an
// attendance register — a section's students down the side, the days of a
// date range across, "P" or "A" where attendance was taken, "-" on a day
// off without it and "N/A" on a school day without it — with each
// student's present and absent days and the attendance SMS sent.

export type RegisterMark = "P" | "A" | "-" | "N/A"

export type RegisterRow = {
  student: Student
  enrolment: Enrolment
  marks: RegisterMark[]
  present: number
  absent: number
  smsCount: number
}

export type AttendanceRegister = {
  days: string[]
  // Consecutive days of the same month, for the heading ("Sep 2026").
  months: { label: string; days: number }[]
  rows: RegisterRow[]
}

export function monthlyAttendanceRegister(
  institute: Institute,
  students: { student: Student; enrolment: Enrolment }[],
  data: { attendance: StudentAttendance[]; sms: SmsMessage[]; holidays: HolidayEvent[] },
  from: string,
  to: string
): AttendanceRegister {
  const days = daysBetween(from, to)
  const inRange = (date: string) => date >= from && date <= days[days.length - 1]
  const ids = new Set(students.map((s) => s.student.id))
  const taken = new Map<string, boolean>()
  for (const a of data.attendance)
    if (ids.has(a.studentId) && inRange(a.date)) taken.set(`${a.studentId}|${a.date}`, a.isPresent)
  const smsCount = new Map<number, number>()
  for (const m of data.sms) {
    if (m.studentId == null || !ids.has(m.studentId) || m.smsType !== "Attendance" || m.status === "Failed") continue
    if (!m.attendanceDate || !inRange(m.attendanceDate)) continue
    smsCount.set(m.studentId, (smsCount.get(m.studentId) ?? 0) + 1)
  }

  const rows = students.map(({ student, enrolment }): RegisterRow => {
    const marks = days.map((date): RegisterMark => {
      const present = taken.get(`${student.id}|${date}`)
      if (present != null) return present ? "P" : "A"
      const off = isWeekend(institute, date) || !!holidayOn(institute, data.holidays, date, enrolment.medium, enrolment.classId)
      return off ? "-" : "N/A"
    })
    return {
      student,
      enrolment,
      marks,
      present: marks.filter((m) => m === "P").length,
      absent: marks.filter((m) => m === "A").length,
      smsCount: smsCount.get(student.id) ?? 0,
    }
  })

  const months: AttendanceRegister["months"] = []
  for (const date of days) {
    const d = new Date(`${date}T00:00:00`)
    const label = `${d.toLocaleDateString("en-US", { month: "short" })} ${d.getFullYear()}`
    const last = months.at(-1)
    if (last?.label === label) last.days++
    else months.push({ label, days: 1 })
  }
  return { days, months, rows }
}
