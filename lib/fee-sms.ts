"use client"

import { classStore } from "@/lib/academic-store"
import { formatAmount, roundMoney } from "@/lib/fee-heads"
import { getFeeInvoices, monthLabel, type FeeInvoice } from "@/lib/fee-invoices"
import { getFeePayments, openLines, type FeePayment } from "@/lib/fee-payments"
import type { Institute } from "@/lib/institutes"
import {
  newCampaignName,
  normalizeMobile,
  queueAndSendSms,
  type SmsDraft,
  type SmsReceiver,
} from "@/lib/sms-messages"
import { fillTemplate, getSmsTemplates, smsLength, type SmsType } from "@/lib/sms-templates"
import { getStudents, type Student } from "@/lib/students"

// The fee SMS: the receipt sent when a collection is recorded, and the due
// reminders of Fees › Due SMS. Both fill the "Fee Payment" / "Fee Due"
// keywords of lib/sms-templates.ts and go out through the SMS queue, so they
// show in SMS History and are charged like any other SMS.

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

// The student's numbers for the receivers, unique and valid; with no
// receivers, the primary communication person's (else the student's).
export function studentNumbers(student: Student, receivers: SmsReceiver[] = []) {
  const raw: Record<SmsReceiver, string> = {
    Student: student.primaryMobile,
    Father: student.fatherMobile,
    Mother: student.motherMobile,
    Guardian: student.guardianMobile,
  }
  const wanted: SmsReceiver[] = receivers.length
    ? receivers
    : [student.primaryCommunicationPerson, "Student"]
  const seen = new Map<string, SmsReceiver>()
  for (const receiver of wanted) {
    const mobile = normalizeMobile(raw[receiver] ?? "")
    if (mobile && !seen.has(mobile)) seen.set(mobile, receiver)
    // Without chosen receivers one number is enough.
    if (!receivers.length && seen.size) break
  }
  return [...seen]
}

function enrolmentOf(student: Student, invoice?: FeeInvoice) {
  return (
    (invoice && student.enrolments.find((e) => e.yearId === invoice.yearId)) ??
    student.enrolments[student.enrolments.length - 1]
  )
}

function studentDue(
  studentId: number,
  upToMonth?: string,
  invoices: FeeInvoice[] = getFeeInvoices(),
  payments: FeePayment[] = getFeePayments()
) {
  const lines = openLines(invoices, payments, studentId).filter(
    (l) => !upToMonth || l.invoice.month <= upToMonth
  )
  const months = [...new Set(lines.map((l) => l.invoice.month))]
  return {
    lines,
    due: roundMoney(lines.reduce((sum, l) => sum + l.due, 0)),
    months,
    lastDueDate: lines.reduce((latest, l) => (l.invoice.dueDate > latest ? l.invoice.dueDate : latest), ""),
  }
}

// The institute's first active template of the type, if any.
export function feeTemplate(instituteId: number, type: Extract<SmsType, "Fee Due" | "Fee Payment">) {
  return getSmsTemplates().find((t) => t.instituteId === instituteId && t.smsType === type && t.status === "Active")
}

// Sends the receipt SMS of a collection with the institute's "Fee Payment"
// template. Returns what happened, for the toast.
export function sendPaymentSms(payment: FeePayment, institute: Institute, user: string) {
  const template = feeTemplate(institute.id, "Fee Payment")
  if (!template) return { ok: false as const, reason: "No active Fee Payment SMS template." }
  const student = getStudents().find((s) => s.id === payment.studentId)
  if (!student) return { ok: false as const, reason: "Student not found." }
  const invoice = getFeeInvoices().find((i) => i.id === payment.allocations[0]?.invoiceId)
  const enrolment = enrolmentOf(student, invoice)
  const values: Record<string, string> = {
    Class: classStore.getList(institute.id).find((c) => c.id === enrolment?.classId)?.name ?? "",
    Name: student.name,
    Roll: enrolment?.classRoll ?? "",
    StudentId: String(student.studentIdentificationNo),
    PaidAmount: formatAmount(payment.total),
    ReceiptNo: payment.receiptNo,
    PaymentDate: dayLabel(payment.paidOn),
    PaymentMethod: payment.method,
    DueAmount: formatAmount(studentDue(student.id).due),
  }
  const message = fillTemplate(template.message, values)
  const numbers = studentNumbers(student)
  if (!numbers.length) return { ok: false as const, reason: "The student has no valid mobile number." }
  const { chars, parts } = smsLength(message)
  const drafts: SmsDraft[] = numbers.map(([mobile, numberType]) => ({
    mobile,
    message,
    studentId: student.id,
    numberType,
    chars,
    parts,
  }))
  const result = queueAndSendSms(
    {
      instituteId: institute.id,
      branchId: enrolment?.branchId ?? null,
      campaignName: `Fee receipt ${payment.receiptNo}`,
      smsType: "Fee Payment",
      resultType: null,
      attendanceType: null,
      examId: null,
      subjectId: null,
      attendanceDate: null,
    },
    drafts,
    user,
    institute.configuration.smsRate
  )
  return { ok: true as const, ...result, mobile: numbers[0][0] }
}

// ---- Due SMS ----

export type DueSmsInput = {
  instituteId: number
  yearId: number
  classId: number | null
  sectionId: number | null
  // Dues billed up to this month count; "" for all.
  upToMonth: string
  minDue: number
  receivers: SmsReceiver[]
  message: string
}

export type DueSmsDraft = SmsDraft & { studentName: string; roll: string; due: number }

// The students of the class (or all classes) owing at least `minDue`, each
// with the message filled for them, one draft per receiving number. The
// dues come from the given invoices and payments (the stores by default).
export function buildDueSms(
  input: DueSmsInput,
  data: { invoices?: FeeInvoice[]; payments?: FeePayment[]; students?: Student[] } = {}
) {
  const classes = new Map(classStore.getList(input.instituteId).map((c) => [c.id, c.name]))
  const drafts: DueSmsDraft[] = []
  let students = 0
  let withoutMobile = 0
  let total = 0
  const targets = (data.students ?? getStudents())
    .filter((s) => s.instituteId === input.instituteId && s.status === "Active")
    .flatMap((student) => {
      const e = student.enrolments.find(
        (en) =>
          en.yearId === input.yearId &&
          (input.classId == null || en.classId === input.classId) &&
          (input.sectionId == null || en.sectionId === input.sectionId)
      )
      return e ? [{ student, enrolment: e }] : []
    })
    .sort(
      (a, b) =>
        a.enrolment.classId - b.enrolment.classId ||
        a.enrolment.classRoll.localeCompare(b.enrolment.classRoll, undefined, { numeric: true })
    )
  for (const { student, enrolment } of targets) {
    const owed = studentDue(student.id, input.upToMonth || undefined, data.invoices, data.payments)
    if (!(owed.due > 0) || owed.due < input.minDue) continue
    students++
    total = roundMoney(total + owed.due)
    const numbers = studentNumbers(student, input.receivers)
    if (!numbers.length) {
      withoutMobile++
      continue
    }
    const message = fillTemplate(input.message, {
      Class: classes.get(enrolment.classId) ?? "",
      Name: student.name,
      Roll: enrolment.classRoll,
      StudentId: String(student.studentIdentificationNo),
      DueAmount: formatAmount(owed.due),
      DueMonths: owed.months.map(monthLabel).join(", "),
      DueDate: owed.lastDueDate ? dayLabel(owed.lastDueDate) : "",
    })
    const { chars, parts } = smsLength(message)
    for (const [mobile, numberType] of numbers) {
      drafts.push({
        mobile,
        message,
        studentId: student.id,
        numberType,
        chars,
        parts,
        studentName: student.name,
        roll: enrolment.classRoll,
        due: owed.due,
      })
    }
  }
  return { drafts, students, withoutMobile, total, parts: drafts.reduce((sum, d) => sum + d.parts, 0) }
}

export function sendDueSms(input: DueSmsInput, drafts: SmsDraft[], institute: Institute, userId: number, user: string) {
  return queueAndSendSms(
    {
      instituteId: input.instituteId,
      branchId: null,
      campaignName: newCampaignName(userId),
      smsType: "Fee Due",
      resultType: null,
      attendanceType: null,
      examId: null,
      subjectId: null,
      attendanceDate: null,
    },
    drafts,
    user,
    institute.configuration.smsRate
  )
}
