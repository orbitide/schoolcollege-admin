"use client"

import * as React from "react"

import { isoDate } from "@/lib/billing"
import { logChanges } from "@/lib/common-log"
import { SANDBOX_PIN } from "@/lib/sandbox-gateway"
import { getSaasInvoices, markInvoicePaid, type SaasInvoice } from "@/lib/saas-invoices"

// Payments institutes make against the platform's invoices: the
// institute's purchase history, each with a receipt. A payment settles one
// invoice in full; paying online (Billing) or the platform recording a
// payment by hand (Mark paid) both land here. In-memory like the rest of
// admin. lib/institutes-store.ts must not import this statically (it seeds
// from the invoices); a deleted institute's payments go through
// lib/institute-module-cleanup.ts.

export const saasPaymentMethods = ["bKash", "Nagad", "SSLCommerz", "Bank transfer", "Cheque", "Cash"] as const
export type SaasPaymentMethod = (typeof saasPaymentMethods)[number]
// The ones the online checkout offers (sandbox).
export const onlineSaasMethods = ["bKash", "Nagad", "SSLCommerz"] as const satisfies readonly SaasPaymentMethod[]
export type OnlineSaasMethod = (typeof onlineSaasMethods)[number]

export type SaasPayment = {
  id: number
  // "RCPT-2026-09-0001": the month paid and a running number within it.
  receiptNo: string
  instituteId: number
  invoiceId: number
  amount: number
  method: SaasPaymentMethod
  // Paid through the checkout, or recorded by the platform.
  source: "Online" | "Manual"
  // Gateway transaction id, bank reference, cheque number.
  reference: string
  // The paying wallet, masked (online wallets only).
  payerAccount: string
  // yyyy-mm-dd
  paidAt: string
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

function nextReceiptNo(all: SaasPayment[], paidAt: string) {
  const month = paidAt.slice(0, 7)
  const used = all.filter((p) => p.paidAt.startsWith(month)).length
  return `RCPT-${month}-${String(used + 1).padStart(4, "0")}`
}

const mask = (account: string) => (account.length > 6 ? `${account.slice(0, 3)}•••••${account.slice(-3)}` : account)

// ---- Seed: a payment for every paid seed invoice ----

function seedPayments(): SaasPayment[] {
  const all: SaasPayment[] = []
  const paid = getSaasInvoices()
    .filter((i) => i.status === "Paid" && i.paidAt)
    .sort((a, b) => a.paidAt!.localeCompare(b.paidAt!) || a.id - b.id)
  for (const invoice of paid) {
    const online = invoice.paymentNote === "bKash"
    const stamp = `${invoice.paidAt}T10:00:00.000Z`
    all.push({
      id: all.length + 1,
      receiptNo: nextReceiptNo(all, invoice.paidAt!),
      instituteId: invoice.instituteId,
      invoiceId: invoice.id,
      amount: invoice.amount,
      method: online ? "bKash" : "Bank transfer",
      source: online ? "Online" : "Manual",
      reference: online ? `BK${(invoice.id * 7919).toString(36).toUpperCase()}` : `DBBL-${100000 + invoice.id * 37}`,
      payerAccount: online ? mask(`0171100${String(invoice.instituteId).padStart(4, "0")}`) : "",
      paidAt: invoice.paidAt!,
      createdBy: online ? "System" : "Super Admin",
      createdAt: stamp,
      modifiedBy: online ? "System" : "Super Admin",
      modifiedAt: stamp,
    })
  }
  return all
}

const seed = seedPayments()
let payments = seed
const listeners = new Set<() => void>()

function emit(next: SaasPayment[]) {
  logChanges("SaasPayment", payments, next, (p) => p.receiptNo)
  payments = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSaasPayments() {
  return React.useSyncExternalStore(subscribe, () => payments, () => seed)
}

const describe = (p: Pick<SaasPayment, "method" | "reference">) =>
  p.reference ? `${p.method}, ref. ${p.reference}` : p.method

function record(
  invoice: SaasInvoice,
  payment: Pick<SaasPayment, "method" | "source" | "reference" | "payerAccount" | "paidAt">,
  user: string
) {
  if (!markInvoicePaid(invoice.id, { paidAt: payment.paidAt, note: describe(payment) }, user)) return null
  const now = new Date().toISOString()
  const created: SaasPayment = {
    id: Math.max(0, ...payments.map((p) => p.id)) + 1,
    receiptNo: nextReceiptNo(payments, payment.paidAt),
    instituteId: invoice.instituteId,
    invoiceId: invoice.id,
    amount: invoice.amount,
    ...payment,
    createdBy: user,
    createdAt: now,
    modifiedBy: user,
    modifiedAt: now,
  }
  emit([...payments, created])
  return created
}

// The platform records a payment made outside the checkout (Mark paid).
export function recordManualPayment(
  invoiceId: number,
  payment: { paidAt: string; method: SaasPaymentMethod; reference: string },
  user: string
) {
  const invoice = getSaasInvoices().find((i) => i.id === invoiceId)
  if (!invoice) return null
  return record(
    invoice,
    { ...payment, reference: payment.reference.trim(), source: "Manual", payerAccount: "" },
    user
  )
}

// An institute pays its own invoice online (Billing), through the same
// SANDBOX gateways as fee payments: SANDBOX_PIN pays, anything else is
// declined. Returns the error to show, or the payment. The real gateway
// call and its server-side verification replace this with the backend.
export function payInvoiceOnline(
  invoiceId: number,
  payment: { method: OnlineSaasMethod; account: string; pin: string },
  user: string
): { error: string } | { payment: SaasPayment } {
  const invoice = getSaasInvoices().find((i) => i.id === invoiceId)
  if (!invoice || invoice.status !== "Due") return { error: "This invoice isn't due any more." }
  const account = payment.account.replace(/[\s-]/g, "")
  const wallet = payment.method !== "SSLCommerz"
  if (wallet && !/^(?:\+?88)?01[3-9]\d{8}$/.test(account))
    return { error: `Enter your ${payment.method} wallet number, like 01XXXXXXXXX.` }
  if (payment.pin !== SANDBOX_PIN) return { error: "Payment declined: wrong PIN." }
  const created = record(
    invoice,
    {
      method: payment.method,
      source: "Online",
      reference: `${payment.method.slice(0, 2).toUpperCase()}${Date.now().toString(36).toUpperCase()}`,
      payerAccount: wallet ? mask(account.slice(-11)) : "",
      paidAt: isoDate(),
    },
    user
  )
  return created ? { payment: created } : { error: "This invoice isn't due any more." }
}

export function removeInstituteSaasPayments(instituteId: number) {
  if (payments.some((p) => p.instituteId === instituteId)) emit(payments.filter((p) => p.instituteId !== instituteId))
}
