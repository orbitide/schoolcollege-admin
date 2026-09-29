"use client"

import * as React from "react"

import {
  addDaysIso,
  billableStudents,
  getBillingSettings,
  isoDate,
  monthEnd,
  monthOf,
  perStudentRate,
  ratesFor,
} from "@/lib/billing"
import { logChanges } from "@/lib/common-log"
import { seedInstitutes, type Institute } from "@/lib/institutes"
import { getSubscriptions } from "@/lib/subscriptions"

// The platform's monthly bill to an institute (SaaS billing, separate from
// student fees): its active students at the month's end times the rate for
// that count, recorded when issued so later changes to students or rates
// don't rewrite it. Overdue isn't stored: it's a due invoice past its date.
export const invoiceStatuses = ["Due", "Paid", "Void"] as const
export type InvoiceStatus = (typeof invoiceStatuses)[number]
// What the lists show and filter by.
export const invoiceStates = ["Due", "Overdue", "Paid", "Void"] as const
export type InvoiceState = (typeof invoiceStates)[number]

export type SaasInvoice = {
  id: number
  invoiceNo: string
  instituteId: number
  // "YYYY-MM", the month billed.
  month: string
  studentCount: number
  rate: number
  amount: number
  status: InvoiceStatus
  issuedAt: string
  dueDate: string
  paidAt: string | null
  paymentNote: string
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export function invoiceState(invoice: Pick<SaasInvoice, "status" | "dueDate">, today = isoDate()): InvoiceState {
  return invoice.status === "Due" && invoice.dueDate < today ? "Overdue" : invoice.status
}

// The next free number for the month, e.g. "INV-2026-08-0007".
function nextInvoiceNo(all: SaasInvoice[], month: string) {
  const used = all.filter((i) => i.month === month).length
  return `INV-${month}-${String(used + 1).padStart(4, "0")}`
}

// Active institutes that had joined by the month's end and have no invoice
// for it yet. Trial and suspended institutes aren't billed.
export function unbilledInstitutes(month: string, institutes: Institute[], invoices: SaasInvoice[]) {
  const billed = new Set(invoices.filter((i) => i.month === month && i.status !== "Void").map((i) => i.instituteId))
  const end = monthEnd(month)
  return institutes.filter((i) => i.status === "Active" && i.joinedAt <= end && !billed.has(i.id))
}

function draft(
  all: SaasInvoice[],
  institute: Institute,
  month: string,
  studentCount: number,
  user: string,
  at: string
): SaasInvoice {
  const settings = getBillingSettings()
  const rates = ratesFor(
    getSubscriptions().find((s) => s.instituteId === institute.id),
    settings
  )
  const rate = perStudentRate(studentCount, rates, settings.threshold)
  const issuedAt = addDaysIso(monthEnd(month), 1)
  return {
    id: Math.max(0, ...all.map((i) => i.id)) + 1,
    invoiceNo: nextInvoiceNo(all, month),
    instituteId: institute.id,
    month,
    studentCount,
    rate,
    amount: studentCount * rate,
    status: "Due",
    issuedAt,
    dueDate: addDaysIso(issuedAt, settings.invoiceDueDays),
    paidAt: null,
    paymentNote: "",
    createdBy: user,
    createdAt: at,
    modifiedBy: user,
    modifiedAt: at,
  }
}

// ---- Seed ----
// Six closed months of invoices for today's active institutes, their
// student counts growing a little each month. Older ones are paid; a few
// recent ones are still due, and one is overdue.

function seedInvoices(): SaasInvoice[] {
  const all: SaasInvoice[] = []
  for (let back = 6; back >= 1; back--) {
    const month = monthOf(-back)
    for (const institute of unbilledInstitutes(month, seedInstitutes, all)) {
      const count = Math.round(institute.students * (1 - 0.015 * back))
      const invoice = draft(all, institute, month, count, "System", `${addDaysIso(monthEnd(month), 1)}T00:05:00.000Z`)
      const unpaid = (back === 1 && institute.id % 3 === 0) || (back === 2 && institute.id % 8 === 7)
      all.push(
        unpaid
          ? invoice
          : {
              ...invoice,
              status: "Paid",
              paidAt: addDaysIso(invoice.issuedAt, 2 + (institute.id % 7)),
              paymentNote: institute.id % 2 ? "bKash" : "Bank transfer",
            }
      )
    }
  }
  return all
}

const seed = seedInvoices()
let invoices = seed
const listeners = new Set<() => void>()

function emit(next: SaasInvoice[]) {
  logChanges("SaasInvoice", invoices, next, (i) => i.invoiceNo)
  invoices = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSaasInvoices() {
  return React.useSyncExternalStore(subscribe, () => invoices, () => seed)
}

// Bills the month for every institute not billed yet; running it again
// adds nothing. Returns how many invoices were issued.
export function generateInvoices(month: string, institutes: Institute[], user: string) {
  const at = new Date().toISOString()
  const next = [...invoices]
  for (const institute of unbilledInstitutes(month, institutes, next)) {
    next.push(draft(next, institute, month, billableStudents(institute), user, at))
  }
  const added = next.length - invoices.length
  if (added) emit(next)
  return added
}

function patch(id: number, changes: Partial<SaasInvoice>, user: string) {
  emit(
    invoices.map((i) =>
      i.id === id ? { ...i, ...changes, modifiedBy: user, modifiedAt: new Date().toISOString() } : i
    )
  )
}

export function markInvoicePaid(id: number, payment: { paidAt: string; note: string }, user: string) {
  const invoice = invoices.find((i) => i.id === id)
  if (!invoice || invoice.status !== "Due") return false
  patch(id, { status: "Paid", paidAt: payment.paidAt, paymentNote: payment.note.trim() }, user)
  return true
}

export function voidInvoice(id: number, user: string) {
  const invoice = invoices.find((i) => i.id === id)
  if (!invoice || invoice.status !== "Due") return false
  patch(id, { status: "Void" }, user)
  return true
}

export function removeInstituteInvoices(instituteId: number) {
  if (invoices.some((i) => i.instituteId === instituteId)) {
    emit(invoices.filter((i) => i.instituteId !== instituteId))
  }
}
