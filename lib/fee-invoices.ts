"use client"

import * as React from "react"

import { classStore } from "@/lib/academic-store"
import { getAttendanceFines, type AttendanceFine } from "@/lib/attendance-fines"
import { logChanges } from "@/lib/common-log"
import { feeHeadStore, roundMoney, type FeeHead } from "@/lib/fee-heads"
import { classFeeAmount, getClassFees, type ClassFee } from "@/lib/fee-setup"
import { getFeeWaivers, waiverPercent, type FeeWaiver } from "@/lib/fee-waivers"
import { getStudents, type Enrolment, type Student } from "@/lib/students"

// Student dues (invoices): what one student owes for one billing month, a
// line per fee head, each with the waiver it was billed with. Generate Dues
// makes them a class (or section) at a time and never bills a line twice:
// every line carries a key saying what it is for (the month, the year, the
// one-time charge, the fine) and a key already on a live invoice is skipped,
// so running it again only adds what is new. Payments are allocated to the
// lines (lib/fee-payments.ts). A mistaken invoice is cancelled, never edited,
// and only while nothing has been paid against it.
// In-memory like the rest of admin; replace with API calls once the backend
// endpoints exist.

export type InvoiceLine = {
  // Unique within the invoice; payments are allocated to it.
  id: number
  feeHeadId: number
  // What the line bills, so it is never billed twice (see lineKey).
  key: string
  // Shown under the head, e.g. "3 days fined (26 Jul – 25 Aug 2026)".
  note: string
  amount: number
  waiver: number
}

export const invoiceStatuses = ["Issued", "Cancelled"] as const
export type InvoiceStatus = (typeof invoiceStatuses)[number]

export type FeeInvoice = {
  id: number
  instituteId: number
  invoiceNo: string
  yearId: number
  studentId: number
  classId: number
  sectionId: number | null
  // Billing month, "2026-09".
  month: string
  issueDate: string
  dueDate: string
  lines: InvoiceLine[]
  status: InvoiceStatus
  cancelReason: string
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export const linePayable = (line: InvoiceLine) => roundMoney(line.amount - line.waiver)
export const invoicePayable = (invoice: FeeInvoice) =>
  roundMoney(invoice.lines.reduce((sum, line) => sum + linePayable(line), 0))

// "September 2026" for "2026-09".
export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number)
  if (!y || !m) return month
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

// "2026-09" for today.
export function thisMonth(at = new Date()) {
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`
}

// What a line bills, by the head's frequency (lib/fee-heads.ts).
export function lineKey(head: Pick<FeeHead, "id" | "frequency">, month: string, yearId: number, fineId?: number) {
  switch (head.frequency) {
    case "Monthly":
    case "Occasional":
      return `${head.id}:${month}`
    case "Yearly":
      return `${head.id}:year-${yearId}`
    case "One Time":
      return `${head.id}:once`
    case "Per Absent Day":
      return `${head.id}:fine-${fineId}`
  }
}

// ---- Generate Dues ----

export type GenerateInput = {
  instituteId: number
  yearId: number
  classId: number
  // null: every section of the class.
  sectionId: number | null
  month: string
  feeHeadIds: number[]
  issueDate: string
  dueDate: string
}

export type SkippedLine = { feeHeadId: number; reason: string }

export type DueRow = {
  student: Student
  enrolment: Enrolment
  lines: Omit<InvoiceLine, "id">[]
  skipped: SkippedLine[]
}

type Sources = {
  students: Student[]
  heads: FeeHead[]
  fees: ClassFee[]
  waivers: FeeWaiver[]
  fines: AttendanceFine[]
  invoices: FeeInvoice[]
}

export function generateProblems(input: GenerateInput) {
  const problems: string[] = []
  if (!input.instituteId) problems.push("Select the institute.")
  if (!input.yearId) problems.push("Select the academic year.")
  if (!input.classId) problems.push("Select the class.")
  if (!/^\d{4}-\d{2}$/.test(input.month)) problems.push("Select the billing month.")
  if (!input.feeHeadIds.length) problems.push("Pick at least one fee head.")
  if (!input.issueDate) problems.push("Select the issue date.")
  if (!input.dueDate) problems.push("Select the due date.")
  else if (input.issueDate && input.dueDate < input.issueDate) problems.push("The due date can't be before the issue date.")
  return problems
}

// The lines each student of the class (or section) would be billed, and
// the heads skipped for them with why: already billed, no amount set for
// the class, or nothing fined.
export function buildDueRows(input: GenerateInput, sources?: Partial<Sources>): DueRow[] {
  const s: Sources = {
    students: sources?.students ?? getStudents(),
    heads: sources?.heads ?? feeHeadStore.getList(input.instituteId),
    fees: sources?.fees ?? getClassFees(),
    waivers: sources?.waivers ?? getFeeWaivers(),
    fines: sources?.fines ?? getAttendanceFines(),
    invoices: sources?.invoices ?? invoices,
  }
  const heads = s.heads.filter((h) => input.feeHeadIds.includes(h.id) && h.status === "Active")
  const billed = new Map<number, Set<string>>()
  for (const invoice of s.invoices) {
    if (invoice.instituteId !== input.instituteId || invoice.status === "Cancelled") continue
    const keys = billed.get(invoice.studentId) ?? new Set<string>()
    invoice.lines.forEach((line) => keys.add(line.key))
    billed.set(invoice.studentId, keys)
  }

  const rows: DueRow[] = []
  for (const student of s.students) {
    if (student.instituteId !== input.instituteId || student.status !== "Active") continue
    const enrolment = student.enrolments.find(
      (e) =>
        e.yearId === input.yearId &&
        e.classId === input.classId &&
        !e.transferred &&
        (input.sectionId == null || e.sectionId === input.sectionId)
    )
    if (!enrolment) continue
    const keys = billed.get(student.id) ?? new Set<string>()
    const lines: DueRow["lines"] = []
    const skipped: SkippedLine[] = []
    for (const head of heads) {
      const amount = classFeeAmount(s.fees, input.yearId, input.classId, head.id)
      if (!(amount > 0)) {
        skipped.push({ feeHeadId: head.id, reason: "No amount set for the class" })
        continue
      }
      const percent = waiverPercent(s.waivers, input.yearId, student.id, head.id)
      const bill = (key: string, gross: number, note: string) => {
        if (keys.has(key)) {
          skipped.push({ feeHeadId: head.id, reason: "Already billed" })
          return
        }
        const total = roundMoney(gross)
        lines.push({ feeHeadId: head.id, key, note, amount: total, waiver: roundMoney((total * percent) / 100) })
      }
      if (head.frequency === "Per Absent Day") {
        const fines = s.fines.filter(
          (f) => f.studentId === student.id && f.finedDays > 0 && f.dateTo.slice(0, 7) === input.month
        )
        if (!fines.length) skipped.push({ feeHeadId: head.id, reason: "Nothing fined this month" })
        for (const fine of fines) {
          bill(
            lineKey(head, input.month, input.yearId, fine.id),
            fine.finedDays * amount,
            `${fine.finedDays} day${fine.finedDays === 1 ? "" : "s"} fined, ${fine.dateFrom} to ${fine.dateTo}`
          )
        }
        continue
      }
      bill(lineKey(head, input.month, input.yearId), amount, "")
    }
    rows.push({ student, enrolment, lines, skipped })
  }
  return rows.sort(
    (a, b) =>
      (a.enrolment.sectionId ?? 0) - (b.enrolment.sectionId ?? 0) ||
      a.enrolment.classRoll.localeCompare(b.enrolment.classRoll, undefined, { numeric: true })
  )
}

// ---- Store ----

const seedUser = "Super Admin"

function nextInvoiceNo(all: FeeInvoice[], instituteId: number, month: string) {
  const prefix = `INV-${month.slice(2, 4)}${month.slice(5, 7)}-`
  const used = all
    .filter((i) => i.instituteId === instituteId && i.invoiceNo.startsWith(prefix))
    .map((i) => Number(i.invoiceNo.slice(prefix.length)) || 0)
  return (n: number) => `${prefix}${String(Math.max(0, ...used) + n).padStart(5, "0")}`
}

function makeInvoices(
  all: FeeInvoice[],
  input: GenerateInput,
  rows: DueRow[],
  user: string,
  stamp: string
): FeeInvoice[] {
  let id = Math.max(0, ...all.map((i) => i.id))
  const number = nextInvoiceNo(all, input.instituteId, input.month)
  return rows
    .filter((row) => row.lines.length)
    .map((row, index) => ({
      id: ++id,
      instituteId: input.instituteId,
      invoiceNo: number(index + 1),
      yearId: input.yearId,
      studentId: row.student.id,
      classId: input.classId,
      sectionId: row.enrolment.sectionId,
      month: input.month,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      lines: row.lines.map((line, i) => ({ ...line, id: i + 1 })),
      status: "Issued" as const,
      cancelReason: "",
      createdBy: user,
      createdAt: stamp,
      modifiedBy: user,
      modifiedAt: stamp,
    }))
}

// Institute 1's 2026 dues from January to this month (at most December):
// tuition and ICT every month, the session fee in January, the exam fee in
// June and absent fines where they were saved.
function seedInvoices(): FeeInvoice[] {
  const last = thisMonth() < "2026-01" ? "2026-01" : thisMonth() > "2026-12" ? "2026-12" : thisMonth()
  const lastMonth = Number(last.slice(5, 7))
  let all: FeeInvoice[] = []
  for (let m = 1; m <= lastMonth; m++) {
    const month = `2026-${String(m).padStart(2, "0")}`
    const feeHeadIds = [1, 2, 6, ...(m === 1 ? [4] : []), ...(m === 6 ? [5] : [])]
    for (const academicClass of classStore.getList(1)) {
      const input: GenerateInput = {
        instituteId: 1,
        yearId: 2,
        classId: academicClass.id,
        sectionId: null,
        month,
        feeHeadIds,
        issueDate: `${month}-01`,
        dueDate: `${month}-15`,
      }
      const rows = buildDueRows(input, { invoices: all })
      all = [...all, ...makeInvoices(all, input, rows, seedUser, `${month}-01T08:00:00.000Z`)]
    }
  }
  return all
}

const seed = seedInvoices()
let invoices: FeeInvoice[] = seed
const listeners = new Set<() => void>()

function emit(next: FeeInvoice[]) {
  logChanges("FeeInvoice", invoices, next, (i) => i.invoiceNo)
  invoices = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useFeeInvoices() {
  return React.useSyncExternalStore(subscribe, () => invoices, () => seed)
}

export function getFeeInvoices() {
  return invoices
}

// Generate Dues: makes the invoices the preview showed. Returns how many
// invoices were made, for how many lines and how much.
export function generateDues(input: GenerateInput, user: string) {
  const problems = generateProblems(input)
  if (problems.length) throw new Error(problems[0])
  const rows = buildDueRows(input)
  const made = makeInvoices(invoices, input, rows, user, new Date().toISOString())
  if (made.length) emit([...invoices, ...made])
  return {
    invoices: made.length,
    lines: made.reduce((sum, i) => sum + i.lines.length, 0),
    amount: roundMoney(made.reduce((sum, i) => sum + invoicePayable(i), 0)),
  }
}

// Only lib/fee-payments.ts calls this, once it has checked nothing is paid.
export function markInvoiceCancelled(id: number, reason: string, user: string) {
  emit(
    invoices.map((i) =>
      i.id === id
        ? { ...i, status: "Cancelled" as const, cancelReason: reason.trim(), modifiedBy: user, modifiedAt: new Date().toISOString() }
        : i
    )
  )
}

export function feeHeadBilled(feeHeadId: number) {
  return invoices.some((i) => i.lines.some((line) => line.feeHeadId === feeHeadId))
}

export function removeInstituteFeeInvoices(instituteId: number) {
  emit(invoices.filter((i) => i.instituteId !== instituteId))
}
