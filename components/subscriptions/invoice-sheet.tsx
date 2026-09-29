"use client"

import { formatTaka, monthName } from "@/lib/billing"
import { formatDate } from "@/lib/institutes"
import { invoiceState, type SaasInvoice } from "@/lib/saas-invoices"
import { cn } from "@/lib/utils"

const stampColor = {
  Paid: "text-green-700/25 border-green-700/25",
  Overdue: "text-red-600/25 border-red-600/25",
  Void: "text-neutral-500/30 border-neutral-500/30",
  Due: "",
}

// The platform's invoice to an institute as one A4 page: From (the
// platform) and Bill to (the institute) as they stood at issue, the charge,
// and how to pay. The same sheet shows on screen and prints.
export function InvoiceSheet({ invoice }: { invoice: SaasInvoice }) {
  const state = invoiceState(invoice)
  const from = invoice.billFrom
  const to = invoice.billTo
  const td = "border border-neutral-300 px-2 py-1.5"

  return (
    <section className="relative flex flex-col gap-5 bg-white p-6 text-[13px] text-black">
      {state !== "Due" && (
        <span
          className={cn(
            "pointer-events-none absolute top-24 right-10 rotate-[-14deg] rounded-md border-4 px-4 py-1 text-4xl font-bold uppercase",
            stampColor[state]
          )}
        >
          {state}
        </span>
      )}

      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-3">
        <div className="grid gap-0.5">
          <h2 className="text-lg font-bold">{from.companyName}</h2>
          <p className="text-xs whitespace-pre-line">{from.address}</p>
          <p className="text-xs">
            {[from.email, from.phone].filter(Boolean).join(" · ")}
          </p>
          {from.bin && <p className="text-xs">BIN: {from.bin}</p>}
        </div>
        <div className="grid gap-0.5 text-right">
          <h1 className="text-2xl font-bold tracking-wide uppercase">Invoice</h1>
          <p className="font-mono text-xs">{invoice.invoiceNo}</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid content-start gap-0.5">
          <span className="text-[11px] font-semibold tracking-wide text-neutral-500 uppercase">Bill to</span>
          <span className="font-semibold">{to.billingName}</span>
          {to.contactPerson && <span className="text-xs">Attn: {to.contactPerson}</span>}
          {to.address && <span className="text-xs whitespace-pre-line">{to.address}</span>}
          {(to.email || to.phone) && (
            <span className="text-xs">{[to.email, to.phone].filter(Boolean).join(" · ")}</span>
          )}
          {to.bin && <span className="text-xs">BIN: {to.bin}</span>}
        </div>
        <dl className="grid content-start grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-xs sm:justify-self-end">
          <dt className="text-neutral-500">Billing month</dt>
          <dd className="text-right">{monthName(invoice.month)}</dd>
          <dt className="text-neutral-500">Issued</dt>
          <dd className="text-right">{formatDate(invoice.issuedAt)}</dd>
          <dt className="text-neutral-500">Due</dt>
          <dd className="text-right">{formatDate(invoice.dueDate)}</dd>
          {invoice.paidAt && (
            <>
              <dt className="text-neutral-500">Paid</dt>
              <dd className="text-right">{formatDate(invoice.paidAt)}</dd>
            </>
          )}
        </dl>
      </div>

      <table className="w-full border-collapse text-xs">
        <thead className="bg-neutral-100">
          <tr>
            <th className={cn(td, "text-left")}>Description</th>
            <th className={cn(td, "w-20 text-right")}>Students</th>
            <th className={cn(td, "w-20 text-right")}>Rate</th>
            <th className={cn(td, "w-28 text-right")}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={td}>
              All features plan, {monthName(invoice.month)}
              <span className="block text-[11px] text-neutral-500">Active students at the month&apos;s end</span>
            </td>
            <td className={cn(td, "text-right tabular-nums")}>{invoice.studentCount.toLocaleString()}</td>
            <td className={cn(td, "text-right tabular-nums")}>{formatTaka(invoice.rate)}</td>
            <td className={cn(td, "text-right tabular-nums")}>{formatTaka(invoice.amount)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className={cn(td, "text-right")} colSpan={3}>
              Total
            </td>
            <td className={cn(td, "text-right tabular-nums")}>{formatTaka(invoice.amount)}</td>
          </tr>
        </tfoot>
      </table>

      {invoice.status === "Paid" && invoice.paymentNote && (
        <p className="text-xs">
          <span className="font-semibold">Payment:</span> {invoice.paymentNote}
        </p>
      )}
      {invoice.status === "Due" && from.paymentInstructions && (
        <div className="grid gap-0.5 rounded border border-neutral-300 p-3 text-xs">
          <span className="font-semibold">How to pay</span>
          <p className="whitespace-pre-line">{from.paymentInstructions}</p>
        </div>
      )}
      {from.invoiceFooter && (
        <footer className="border-t border-neutral-300 pt-2 text-center text-[11px] text-neutral-500">
          {from.invoiceFooter}
        </footer>
      )}
    </section>
  )
}
