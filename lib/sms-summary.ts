import type { SmsMessage, SmsStatus } from "@/lib/sms-messages"
import { smsTypes, type SmsAttendanceType, type SmsResultType, type SmsType } from "@/lib/sms-templates"

// Legacy Sms/CombineSmsReport ("SMS Summary", LoadSmsCombineGrouByReportDto):
// how many SMS were pending, sent and failed — and how many SMS parts they
// took — per day, month, year or SMS type.

export const summaryDisplayTypes = ["Daily", "Monthly", "Yearly", "SMS Type wise"] as const
export type SummaryDisplayType = (typeof summaryDisplayTypes)[number]

export type SummaryFilter = {
  // null: every institute the user may see.
  instituteId: number | null
  dateFrom: string
  dateTo: string
  smsType: SmsType | ""
  resultType: SmsResultType | ""
  attendanceType: SmsAttendanceType | ""
  displayBy: SummaryDisplayType
}

export type SummaryCell = { count: number; parts: number }

export type SummaryRow = {
  key: string
  label: string
  Pending: SummaryCell
  Sent: SummaryCell
  Failed: SummaryCell
  total: SummaryCell
  // What the sent SMS cost at their institute's rate.
  cost: number
}

// Legacy CombineSmsReport's checks, in its words.
export function summaryProblems(filter: SummaryFilter) {
  const problems: string[] = []
  if (!filter.dateFrom) problems.push("Please select date from.")
  if (!filter.dateTo) problems.push("Please select date to.")
  if (filter.dateFrom && filter.dateTo && filter.dateTo < filter.dateFrom) {
    problems.push("Date to can't be earlier than date from.")
  }
  return problems
}

const monthName = (month: number) =>
  new Date(2000, month - 1, 1).toLocaleDateString("en-US", { month: "short" })

// The group an SMS falls in and how it reads: "Sep 27, 2026", "Sep, 2026",
// "2026" or the SMS type, as the legacy DATE_FORMATs do.
function groupOf(m: SmsMessage, displayBy: SummaryDisplayType): [key: string, label: string] {
  const [year, month, day] = m.createdAt.slice(0, 10).split("-").map(Number)
  switch (displayBy) {
    case "Daily":
      return [m.createdAt.slice(0, 10), `${monthName(month)} ${String(day).padStart(2, "0")}, ${year}`]
    case "Monthly":
      return [m.createdAt.slice(0, 7), `${monthName(month)}, ${year}`]
    case "Yearly":
      return [String(year), String(year)]
    default:
      return [String(smsTypes.indexOf(m.smsType)).padStart(2, "0"), m.smsType]
  }
}

export function smsSummary(
  messages: SmsMessage[],
  filter: SummaryFilter,
  allowedInstitutes: Set<number>,
  rateOf: (instituteId: number) => number
): SummaryRow[] {
  if (summaryProblems(filter).length) return []
  const rows = new Map<string, SummaryRow>()
  const cell = (): SummaryCell => ({ count: 0, parts: 0 })
  for (const m of messages) {
    const day = m.createdAt.slice(0, 10)
    if (!allowedInstitutes.has(m.instituteId)) continue
    if (filter.instituteId != null && m.instituteId !== filter.instituteId) continue
    if (day < filter.dateFrom || day > filter.dateTo) continue
    if (filter.smsType && m.smsType !== filter.smsType) continue
    if (filter.smsType === "Result" && filter.resultType && m.resultType !== filter.resultType) continue
    if (
      (filter.smsType === "Attendance" || filter.smsType === "Exam Attendance") &&
      filter.attendanceType &&
      m.attendanceType !== filter.attendanceType
    ) {
      continue
    }
    const [key, label] = groupOf(m, filter.displayBy)
    const row = rows.get(key) ?? {
      key,
      label,
      Pending: cell(),
      Sent: cell(),
      Failed: cell(),
      total: cell(),
      cost: 0,
    }
    const status: SmsStatus = m.status
    row[status].count++
    row[status].parts += m.parts
    row.total.count++
    row.total.parts += m.parts
    if (status === "Sent") row.cost += m.parts * rateOf(m.instituteId)
    rows.set(key, row)
  }
  return [...rows.values()].sort((a, b) => a.key.localeCompare(b.key))
}

// The column totals of the summary (legacy shows them when there are two
// rows or more).
export function summaryTotal(rows: SummaryRow[]): SummaryRow {
  const sum = (pick: (r: SummaryRow) => SummaryCell): SummaryCell => ({
    count: rows.reduce((s, r) => s + pick(r).count, 0),
    parts: rows.reduce((s, r) => s + pick(r).parts, 0),
  })
  return {
    key: "total",
    label: "Total",
    Pending: sum((r) => r.Pending),
    Sent: sum((r) => r.Sent),
    Failed: sum((r) => r.Failed),
    total: sum((r) => r.total),
    cost: rows.reduce((s, r) => s + r.cost, 0),
  }
}

// The filter as URL parameters, so the page and its print view share it.
export function summaryParams(filter: SummaryFilter & { details: boolean }) {
  const params = new URLSearchParams()
  if (filter.instituteId != null) params.set("institute", String(filter.instituteId))
  params.set("from", filter.dateFrom)
  params.set("to", filter.dateTo)
  if (filter.smsType) params.set("type", filter.smsType)
  if (filter.resultType) params.set("result", filter.resultType)
  if (filter.attendanceType) params.set("attendance", filter.attendanceType)
  params.set("by", filter.displayBy)
  if (!filter.details) params.set("details", "0")
  return params
}

// Reads the filter back from the URL; this month so far, daily and with
// details (as the legacy page opens) when nothing is set.
export function readSummaryFilter(
  params: Pick<URLSearchParams, "get">,
  today: string
): SummaryFilter & { details: boolean } {
  const get = (key: string) => params.get(key) ?? ""
  const by = get("by") as SummaryDisplayType
  const type = smsTypes.find((t) => t === get("type")) ?? ""
  return {
    instituteId: get("institute") ? Number(get("institute")) : null,
    dateFrom: get("from") || `${today.slice(0, 8)}01`,
    dateTo: get("to") || today,
    smsType: type,
    resultType: type === "Result" ? (get("result") as SmsResultType | "") : "",
    attendanceType:
      type === "Attendance" || type === "Exam Attendance" ? (get("attendance") as SmsAttendanceType | "") : "",
    displayBy: summaryDisplayTypes.includes(by) ? by : "Daily",
    details: get("details") !== "0",
  }
}
