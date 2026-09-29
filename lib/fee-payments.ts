"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"
import { roundMoney } from "@/lib/fee-heads"
import {
  getFeeInvoices,
  invoicePayable,
  linePayable,
  markInvoiceCancelled,
  useFeeInvoices,
  type FeeInvoice,
  type InvoiceLine,
} from "@/lib/fee-invoices"

// Fee collections: money received from a student, with the receipt number,
// how it was paid and which invoice lines it paid (its allocations). The
// counter collects cash or a mobile-banking / bank reference; an online
// payment (lib/online-payments.ts) records one here once it is verified. A
// wrong collection is cancelled with a reason, never edited or removed, so
// the receipt number stays accounted for and the dues it paid open again.
// In-memory like the rest of admin; replace with API calls once the backend
// endpoints exist.

export const paymentMethods = ["Cash", "bKash", "Nagad", "Rocket", "Card", "Bank Deposit", "Cheque"] as const
export type PaymentMethod = (typeof paymentMethods)[number]
// Methods an online payment arrives through (lib/online-payments.ts).
export const onlineGateways = ["bKash", "Nagad", "SSLCommerz"] as const
export type OnlineGateway = (typeof onlineGateways)[number]

export type Allocation = { invoiceId: number; lineId: number; amount: number }

export type FeePayment = {
  id: number
  instituteId: number
  receiptNo: string
  studentId: number
  // ISO date the money was received.
  paidOn: string
  method: PaymentMethod | OnlineGateway
  // Transaction ID, bank slip or cheque number; "" for cash.
  reference: string
  note: string
  allocations: Allocation[]
  total: number
  source: "Counter" | "Online"
  onlinePaymentId: number | null
  status: "Valid" | "Cancelled"
  cancelReason: string
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

// ---- Balances ----

const lineRef = (invoiceId: number, lineId: number) => `${invoiceId}|${lineId}`

// What valid payments have paid on each invoice line.
export function paidByLine(payments: FeePayment[]) {
  const paid = new Map<string, number>()
  for (const payment of payments) {
    if (payment.status !== "Valid") continue
    for (const a of payment.allocations) {
      const ref = lineRef(a.invoiceId, a.lineId)
      paid.set(ref, roundMoney((paid.get(ref) ?? 0) + a.amount))
    }
  }
  return paid
}

export type DueStatus = "Paid" | "Partial" | "Unpaid" | "Overdue" | "Cancelled"

export type InvoiceBalance = {
  payable: number
  paid: number
  due: number
  status: DueStatus
}

export function invoiceBalance(
  invoice: FeeInvoice,
  paid: Map<string, number>,
  today = new Date().toISOString().slice(0, 10)
): InvoiceBalance {
  const payable = invoicePayable(invoice)
  const got = roundMoney(invoice.lines.reduce((sum, l) => sum + (paid.get(lineRef(invoice.id, l.id)) ?? 0), 0))
  const due = roundMoney(Math.max(0, payable - got))
  const status: DueStatus =
    invoice.status === "Cancelled"
      ? "Cancelled"
      : due === 0
        ? "Paid"
        : got > 0
          ? "Partial"
          : invoice.dueDate < today
            ? "Overdue"
            : "Unpaid"
  return { payable, paid: got, due, status }
}

// An invoice line still (partly) owed.
export type OpenLine = {
  invoice: FeeInvoice
  line: InvoiceLine
  payable: number
  paid: number
  due: number
}

// The student's unpaid lines, oldest month first, as the counter lists them.
export function openLines(invoices: FeeInvoice[], payments: FeePayment[], studentId: number): OpenLine[] {
  const paid = paidByLine(payments)
  return invoices
    .filter((i) => i.studentId === studentId && i.status === "Issued")
    .sort((a, b) => a.month.localeCompare(b.month) || a.id - b.id)
    .flatMap((invoice) =>
      invoice.lines.flatMap((line) => {
        const payable = linePayable(line)
        const got = paid.get(lineRef(invoice.id, line.id)) ?? 0
        const due = roundMoney(payable - got)
        return due > 0 ? [{ invoice, line, payable, paid: got, due }] : []
      })
    )
}

// Spreads an amount over the open lines, oldest first (legacy-style
// automatic allocation); what is left over is returned, not kept as credit.
export function allocate(lines: OpenLine[], amount: number) {
  let left = roundMoney(amount)
  const allocations: Allocation[] = []
  for (const open of lines) {
    if (left <= 0) break
    const take = roundMoney(Math.min(open.due, left))
    allocations.push({ invoiceId: open.invoice.id, lineId: open.line.id, amount: take })
    left = roundMoney(left - take)
  }
  return { allocations, left }
}

// ---- Store ----

const seedUser = "Super Admin"

function receiptPrefix(paidOn: string) {
  return `RC-${paidOn.slice(2, 4)}-`
}

function nextReceiptNo(all: FeePayment[], instituteId: number, paidOn: string) {
  const prefix = receiptPrefix(paidOn)
  const used = all
    .filter((p) => p.instituteId === instituteId && p.receiptNo.startsWith(prefix))
    .map((p) => Number(p.receiptNo.slice(prefix.length)) || 0)
  return `${prefix}${String(Math.max(0, ...used) + 1).padStart(6, "0")}`
}

// Most seeded students pay each month's dues in the next weeks; every
// seventh stopped paying after May, every fifth paid half of last month,
// and nobody has paid this month yet.
function seedPayments(): FeePayment[] {
  const all: FeePayment[] = []
  const methods: PaymentMethod[] = ["Cash", "Cash", "bKash", "Cash", "Nagad", "Cash", "Bank Deposit"]
  const invoices = getFeeInvoices()
  const months = [...new Set(invoices.map((i) => i.month))].sort()
  const current = months[months.length - 1]
  const previous = months[months.length - 2]
  for (const invoice of [...invoices].sort((a, b) => a.month.localeCompare(b.month) || a.id - b.id)) {
    if (invoice.month === current) continue
    const s = invoice.studentId
    if (s % 7 === 0 && invoice.month >= "2026-06") continue
    const half = s % 5 === 1 && invoice.month === previous
    const payable = invoicePayable(invoice)
    if (!(payable > 0)) continue
    const target = half ? roundMoney(payable / 2) : payable
    let left = target
    const allocations: Allocation[] = []
    for (const line of invoice.lines) {
      if (left <= 0) break
      const take = Math.min(linePayable(line), left)
      if (take > 0) allocations.push({ invoiceId: invoice.id, lineId: line.id, amount: take })
      left = roundMoney(left - take)
    }
    const method = methods[(s + Number(invoice.month.slice(5))) % methods.length]
    const paidOn = `${invoice.month}-${String(5 + ((s * 3) % 20)).padStart(2, "0")}`
    const at = `${paidOn}T10:${String(s % 60).padStart(2, "0")}:00.000Z`
    all.push({
      id: all.length + 1,
      instituteId: invoice.instituteId,
      receiptNo: nextReceiptNo(all, invoice.instituteId, paidOn),
      studentId: s,
      paidOn,
      method,
      reference: method === "Cash" ? "" : method === "Bank Deposit" ? `DBBL-${700000 + all.length}` : `TX${(9_000_000 + all.length * 37).toString(36).toUpperCase()}`,
      note: "",
      allocations,
      total: target,
      source: "Counter",
      onlinePaymentId: null,
      status: "Valid",
      cancelReason: "",
      createdBy: seedUser,
      createdAt: at,
      modifiedBy: seedUser,
      modifiedAt: at,
    })
  }
  return all
}

const seed = seedPayments()
let payments: FeePayment[] = seed
const listeners = new Set<() => void>()

function emit(next: FeePayment[]) {
  logChanges("FeePayment", payments, next, (p) => p.receiptNo)
  payments = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useFeePayments() {
  return React.useSyncExternalStore(subscribe, () => payments, () => seed)
}

export function getFeePayments() {
  return payments
}

// Invoices and payments together, with each invoice's balance.
export function useFeeLedger() {
  const invoices = useFeeInvoices()
  const all = useFeePayments()
  return React.useMemo(() => {
    const paid = paidByLine(all)
    return {
      invoices,
      payments: all,
      paid,
      balanceOf: (invoice: FeeInvoice) => invoiceBalance(invoice, paid),
    }
  }, [invoices, all])
}

export type PaymentInput = {
  instituteId: number
  studentId: number
  paidOn: string
  method: FeePayment["method"]
  reference: string
  note: string
  allocations: Allocation[]
  source: FeePayment["source"]
  onlinePaymentId: number | null
}

// Collects a payment. Every allocation must be on a live invoice line of the
// student and within what is still owed on it.
export function recordPayment(input: PaymentInput, user: string) {
  const allocations = input.allocations.filter((a) => a.amount > 0).map((a) => ({ ...a, amount: roundMoney(a.amount) }))
  if (!allocations.length) throw new Error("Pick at least one due to pay.")
  if (!input.paidOn) throw new Error("Payment date is required.")
  if (input.method !== "Cash" && !input.reference.trim()) {
    throw new Error(`Enter the ${input.method} transaction or reference number.`)
  }
  const invoices = new Map(getFeeInvoices().map((i) => [i.id, i]))
  const due = new Map(
    openLines([...invoices.values()], payments, input.studentId).map((o) => [lineRef(o.invoice.id, o.line.id), o.due])
  )
  for (const a of allocations) {
    const invoice = invoices.get(a.invoiceId)
    if (!invoice || invoice.studentId !== input.studentId || invoice.status !== "Issued") {
      throw new Error("A picked due is no longer open. Reload the student's dues.")
    }
    const owed = due.get(lineRef(a.invoiceId, a.lineId)) ?? 0
    if (a.amount > owed) throw new Error(`${invoice.invoiceNo}: pays more than the ${owed} still due.`)
  }
  if (input.onlinePaymentId != null && payments.some((p) => p.onlinePaymentId === input.onlinePaymentId)) {
    throw new Error("This online payment is already recorded.")
  }
  const stamp = new Date().toISOString()
  const payment: FeePayment = {
    id: Math.max(0, ...payments.map((p) => p.id)) + 1,
    instituteId: input.instituteId,
    receiptNo: nextReceiptNo(payments, input.instituteId, input.paidOn),
    studentId: input.studentId,
    paidOn: input.paidOn,
    method: input.method,
    reference: input.reference.trim(),
    note: input.note.trim(),
    allocations,
    total: roundMoney(allocations.reduce((sum, a) => sum + a.amount, 0)),
    source: input.source,
    onlinePaymentId: input.onlinePaymentId,
    status: "Valid",
    cancelReason: "",
    createdBy: user,
    createdAt: stamp,
    modifiedBy: user,
    modifiedAt: stamp,
  }
  emit([...payments, payment])
  return payment
}

// Cancels a collection; the dues it paid are open again.
export function cancelPayment(id: number, reason: string, user: string) {
  if (!reason.trim()) throw new Error("Give the reason for cancelling.")
  const payment = payments.find((p) => p.id === id)
  if (!payment || payment.status === "Cancelled") return
  emit(
    payments.map((p) =>
      p.id === id
        ? { ...p, status: "Cancelled" as const, cancelReason: reason.trim(), modifiedBy: user, modifiedAt: new Date().toISOString() }
        : p
    )
  )
}

// Cancels an invoice nothing has been paid on (cancel its payments first).
export function cancelFeeInvoice(id: number, reason: string, user: string) {
  if (!reason.trim()) throw new Error("Give the reason for cancelling.")
  const invoice = getFeeInvoices().find((i) => i.id === id)
  if (!invoice || invoice.status === "Cancelled") return
  if (invoiceBalance(invoice, paidByLine(payments)).paid > 0) {
    throw new Error("Money has been collected on this invoice. Cancel those receipts first.")
  }
  markInvoiceCancelled(id, reason, user)
}

export function removeInstituteFeePayments(instituteId: number) {
  emit(payments.filter((p) => p.instituteId !== instituteId))
}
