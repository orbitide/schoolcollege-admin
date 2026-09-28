import type { AttendanceFine } from "@/lib/attendance-fines"
import type { HolidayEvent, Institute } from "@/lib/institutes"
import type { SmsMessage } from "@/lib/sms-messages"
import { holidayOn, isWeekend, type StudentAttendance } from "@/lib/student-attendance"
import type { Student } from "@/lib/students"
import type { TermExam } from "@/lib/term-exams"

// The figures on an institute's dashboard (legacy SchoolCollegeDashboard:
// StudentRepository.GetDashboardStudentCount, GetGraphDashboard and the
// Today / Yesterday / Last 7 / Last 30 days table), worked out from the
// same stores the reports read, so the two agree.

// The ISO date `days` after (or before, when negative) `date`.
export function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number)
  const next = new Date(y, m - 1, d + days)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`
}

export type StudentCounts = {
  total: number
  male: number
  female: number
  present: number
  absent: number
  // Students whose attendance hasn't been taken today.
  notTaken: number
  // Sections with students but no attendance taken today.
  sectionsNotTaken: number
}

// The institute's active students in the academic year, as legacy counts
// them (active StudentClass rows of the current year), with today's
// attendance.
export function studentCounts(
  institute: Institute,
  students: Student[],
  attendance: StudentAttendance[],
  yearId: number | undefined,
  today: string
): StudentCounts {
  const enrolled = students.flatMap((student) => {
    if (student.instituteId !== institute.id || student.status !== "Active") return []
    const enrolment =
      yearId == null
        ? student.enrolments[student.enrolments.length - 1]
        : student.enrolments.find((e) => e.yearId === yearId)
    return enrolment ? [{ student, sectionId: enrolment.sectionId }] : []
  })
  const taken = new Map<number, boolean>()
  const sectionsTaken = new Set<number>()
  for (const a of attendance) {
    if (a.instituteId !== institute.id || a.date !== today) continue
    taken.set(a.studentId, a.isPresent)
    sectionsTaken.add(a.sectionId)
  }

  const counts: StudentCounts = {
    total: enrolled.length,
    male: 0,
    female: 0,
    present: 0,
    absent: 0,
    notTaken: 0,
    sectionsNotTaken: 0,
  }
  const sections = new Set<number>()
  for (const { student, sectionId } of enrolled) {
    if (student.gender === "Male") counts.male++
    else if (student.gender === "Female") counts.female++
    const present = taken.get(student.id)
    if (present === true) counts.present++
    else if (present === false) counts.absent++
    else counts.notTaken++
    if (sectionId != null) sections.add(sectionId)
  }
  counts.sectionsNotTaken = [...sections].filter((id) => !sectionsTaken.has(id)).length
  return counts
}

export type TrendDay = {
  date: string
  present: number
  absent: number
  sms: number
  // Why the institute was closed, as legacy marks the graph: a holiday
  // "(H)" or a weekend "(W)".
  off: "H" | "W" | null
}

// Present, absent and attendance SMS sent per day for the `days` days up
// to today.
export function attendanceTrend(
  institute: Institute,
  data: { attendance: StudentAttendance[]; sms: SmsMessage[]; holidays: HolidayEvent[] },
  today: string,
  days = 30
): TrendDay[] {
  const from = addDays(today, -(days - 1))
  const byDate = new Map<string, TrendDay>()
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i)
    const off = holidayOn(institute, data.holidays, date) ? "H" : isWeekend(institute, date) ? "W" : null
    byDate.set(date, { date, present: 0, absent: 0, sms: 0, off })
  }
  for (const a of data.attendance) {
    if (a.instituteId !== institute.id) continue
    const day = byDate.get(a.date)
    if (!day) continue
    if (a.isPresent) day.present++
    else day.absent++
  }
  for (const m of data.sms) {
    if (m.instituteId !== institute.id || m.smsType !== "Attendance" || m.status !== "Sent") continue
    const day = byDate.get(m.attendanceDate ?? m.sentAt?.slice(0, 10) ?? "")
    if (day) day.sms++
  }
  return [...byDate.values()]
}

export type PeriodTotals = { label: string; present: number; absent: number; sms: number }

// Legacy's summary table: the trend summed over the last 1, 7 and 30 days,
// and yesterday.
export function periodTotals(trend: TrendDay[]): PeriodTotals[] {
  const sum = (label: string, days: TrendDay[]) => ({
    label,
    present: days.reduce((s, d) => s + d.present, 0),
    absent: days.reduce((s, d) => s + d.absent, 0),
    sms: days.reduce((s, d) => s + d.sms, 0),
  })
  const n = trend.length
  return [
    sum("Today", trend.slice(n - 1)),
    sum("Yesterday", trend.slice(n - 2, n - 1)),
    sum("Last 7 days", trend.slice(-7)),
    sum(`Last ${n} days`, trend),
  ]
}

export type UpcomingHoliday = { holiday: HolidayEvent; date: string }

// The institute's holidays in the next `days` days, each at the first day
// it falls on (yearly ones included).
export function upcomingHolidays(
  institute: Institute,
  holidays: HolidayEvent[],
  today: string,
  days = 30
): UpcomingHoliday[] {
  const seen = new Set<number>()
  const list: UpcomingHoliday[] = []
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i)
    for (const holiday of holidays) {
      if (seen.has(holiday.id)) continue
      if (holidayOn(institute, [holiday], date)) {
        seen.add(holiday.id)
        list.push({ holiday, date })
      }
    }
  }
  return list
}

// Active term exams of the institute still running or yet to start,
// soonest first.
export function upcomingExams(instituteId: number, exams: TermExam[], today: string) {
  return exams
    .filter((e) => e.instituteId === instituteId && e.status === "Active" && e.examEnd >= today)
    .sort((a, b) => a.examStart.localeCompare(b.examStart) || a.rank - b.rank)
}

// Absent fines saved for periods ending this month: how many students and
// days were fined.
export function finesThisMonth(instituteId: number, fines: AttendanceFine[], today: string) {
  const month = today.slice(0, 7)
  const these = fines.filter((f) => f.instituteId === instituteId && f.dateTo.startsWith(month) && f.finedDays > 0)
  return {
    students: new Set(these.map((f) => f.studentId)).size,
    days: these.reduce((sum, f) => sum + f.finedDays, 0),
  }
}
