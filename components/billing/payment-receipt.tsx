"use client"

import { PrinterIcon } from "lucide-react"

import { PrintArea } from "@/components/reports/print-area"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatTaka, monthName } from "@/lib/billing"
import { formatDate } from "@/lib/institutes"
import { useSaasInvoices, type SaasInvoice } from "@/lib/saas-invoices"
import type { SaasPayment } from "@/lib/saas-payments"
import { cn } from "@/lib/utils"

// The platform's receipt for one payment: who paid whom (as on the invoice
// it settled), for what, how and when.
export function PaymentReceiptSheet({ payment, invoice }: { payment: SaasPayment; invoice: SaasInvoice }) {
  const from = invoice.billFrom
  const to = invoice.billTo
  const td = "border border-neutral-300 px-2 py-1.5"
  const rows = [
    ["Paid on", formatDate(payment.paidAt)],
    ["Method", `${payment.method}${payment.source === "Online" ? " (online)" : ""}`],
    ...(payment.reference ? [["Reference", payment.reference]] : []),
    ...(payment.payerAccount ? [["Paid from", payment.payerAccount]] : []),
  ]

  return (
    <section className="relative flex flex-col gap-5 bg-white p-6 text-[13px] text-black">
      <span className="pointer-events-none absolute top-24 right-10 rotate-[-14deg] rounded-md border-4 border-green-700/25 px-4 py-1 text-4xl font-bold text-green-700/25 uppercase">
        Paid
      </span>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-3">
        <div className="grid gap-0.5">
          <h2 className="text-lg font-bold">{from.companyName}</h2>
          <p className="text-xs whitespace-pre-line">{from.address}</p>
          <p className="text-xs">{[from.email, from.phone].filter(Boolean).join(" · ")}</p>
          {from.bin && <p className="text-xs">BIN: {from.bin}</p>}
        </div>
        <div className="grid gap-0.5 text-right">
          <h1 className="text-2xl font-bold tracking-wide uppercase">Receipt</h1>
          <p className="font-mono text-xs">{payment.receiptNo}</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid content-start gap-0.5">
          <span className="text-[11px] font-semibold tracking-wide text-neutral-500 uppercase">Received from</span>
          <span className="font-semibold">{to.billingName}</span>
          {to.contactPerson && <span className="text-xs">Attn: {to.contactPerson}</span>}
          {to.address && <span className="text-xs whitespace-pre-line">{to.address}</span>}
          {to.bin && <span className="text-xs">BIN: {to.bin}</span>}
        </div>
        <dl className="grid content-start grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-xs sm:justify-self-end">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-neutral-500">{label}</dt>
              <dd className="text-right">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <table className="w-full border-collapse text-xs">
        <thead className="bg-neutral-100">
          <tr>
            <th className={cn(td, "text-left")}>For</th>
            <th className={cn(td, "w-32 text-right")}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={td}>
              Invoice {invoice.invoiceNo}: All features plan, {monthName(invoice.month)}
              <span className="block text-[11px] text-neutral-500">
                {invoice.studentCount.toLocaleString()} students × {formatTaka(invoice.rate)}
              </span>
            </td>
            <td className={cn(td, "text-right tabular-nums")}>{formatTaka(payment.amount)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className={cn(td, "text-right")}>Total received</td>
            <td className={cn(td, "text-right tabular-nums")}>{formatTaka(payment.amount)}</td>
          </tr>
        </tfoot>
      </table>

      <p className="text-xs">Received with thanks. This invoice is now settled in full.</p>
      {from.invoiceFooter && (
        <footer className="border-t border-neutral-300 pt-2 text-center text-[11px] text-neutral-500">
          {from.invoiceFooter}
        </footer>
      )}
    </section>
  )
}

// A payment's receipt with a Print button; open while `payment` is set.
export function PaymentReceiptDialog({ payment, onClose }: { payment: SaasPayment | null; onClose: () => void }) {
  const invoices = useSaasInvoices()
  const invoice = payment && invoices.find((i) => i.id === payment.invoiceId)
  const sheet = payment && invoice && <PaymentReceiptSheet payment={payment} invoice={invoice} />

  return (
    <Dialog open={!!payment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Receipt {payment?.receiptNo}</DialogTitle>
          <DialogDescription>
            {payment && `${formatTaka(payment.amount)} paid on ${formatDate(payment.paidAt)}`}
          </DialogDescription>
        </DialogHeader>
        {sheet ? (
          <div className="overflow-hidden rounded-md border">{sheet}</div>
        ) : (
          <p className="text-sm text-muted-foreground">The invoice this payment settled no longer exists.</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.print()} disabled={!sheet}>
            <PrinterIcon data-icon="inline-start" />
            Print
          </Button>
        </DialogFooter>
        {sheet && (
          <PrintArea pageSize="A4 portrait" margin="10mm">
            {sheet}
          </PrintArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
