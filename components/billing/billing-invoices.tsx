"use client"

import * as React from "react"
import { EyeIcon, WalletIcon } from "lucide-react"
import { toast } from "sonner"

import { BILLING_RESOURCE } from "@/components/billing/billing-overview"
import { NoBillingInstitute, useBillingScope } from "@/components/billing/billing-shell"
import { PaymentReceiptDialog } from "@/components/billing/payment-receipt"
import { TextField } from "@/components/settings/settings-fields"
import { InvoiceList } from "@/components/subscriptions/invoice-list"
import { InvoiceStateBadge } from "@/components/subscriptions/invoice-state-badge"
import { InvoiceDialog } from "@/components/subscriptions/subscription-dialogs"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { permissionCode, useCan } from "@/lib/access"
import { formatTaka, monthName } from "@/lib/billing"
import { useCurrentUser } from "@/lib/current-user"
import { formatDate, type Institute } from "@/lib/institutes"
import { invoiceState, useSaasInvoices, type SaasInvoice } from "@/lib/saas-invoices"
import {
  onlineSaasMethods,
  payInvoiceOnline,
  type OnlineSaasMethod,
  type SaasPayment,
} from "@/lib/saas-payments"
import { SANDBOX_PIN } from "@/lib/sandbox-gateway"

// Billing › Invoices: every invoice (with the month-end run) for platform
// admins; the institute's own, which Manage may pay online, for others.
export function BillingInvoices() {
  const { platform, institute } = useBillingScope()
  if (platform) return <InvoiceList />
  if (!institute) return <NoBillingInstitute />
  return <InstituteInvoices key={institute.id} institute={institute} />
}

function InstituteInvoices({ institute }: { institute: Institute }) {
  const can = useCan()
  const canPay = can(permissionCode(BILLING_RESOURCE, "Manage"))
  const invoices = useSaasInvoices()
  const [viewing, setViewing] = React.useState<SaasInvoice | null>(null)
  const [paying, setPaying] = React.useState<SaasInvoice | null>(null)
  const [receipt, setReceipt] = React.useState<SaasPayment | null>(null)

  const rows = invoices
    .filter((i) => i.instituteId === institute.id)
    .sort((a, b) => b.month.localeCompare(a.month))

  return (
    <>
      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Invoice</TableHead>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="pl-4 font-medium">{invoice.invoiceNo}</TableCell>
                    <TableCell>{monthName(invoice.month)}</TableCell>
                    <TableCell className="text-right tabular-nums">{invoice.studentCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatTaka(invoice.rate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatTaka(invoice.amount)}</TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell>
                      <InvoiceStateBadge state={invoiceState(invoice)} />
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setViewing(invoice)}>
                          <EyeIcon data-icon="inline-start" />
                          View
                        </Button>
                        {canPay && invoice.status === "Due" && (
                          <Button size="sm" onClick={() => setPaying(invoice)}>
                            <WalletIcon data-icon="inline-start" />
                            Pay
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No invoices yet. The first one is issued after your first full month.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {viewing && (
        <InvoiceDialog
          invoice={invoices.find((i) => i.id === viewing.id) ?? viewing}
          open
          onOpenChange={(open) => !open && setViewing(null)}
        />
      )}
      {paying && (
        <PayDialog
          key={paying.id}
          invoice={paying}
          onClose={() => setPaying(null)}
          onPaid={(payment) => {
            setPaying(null)
            setReceipt(payment)
          }}
        />
      )}
      <PaymentReceiptDialog payment={receipt} onClose={() => setReceipt(null)} />
    </>
  )
}

// Sandbox checkout, as on the fee module's /pay page. A payment shows its
// receipt straight away.
function PayDialog({
  invoice,
  onClose,
  onPaid,
}: {
  invoice: SaasInvoice
  onClose: () => void
  onPaid: (payment: SaasPayment) => void
}) {
  const user = useCurrentUser()
  const [method, setMethod] = React.useState<OnlineSaasMethod>("bKash")
  const [account, setAccount] = React.useState("")
  const [pin, setPin] = React.useState("")
  const [error, setError] = React.useState("")
  const wallet = method !== "SSLCommerz"

  function pay(event: React.FormEvent) {
    event.preventDefault()
    const result = payInvoiceOnline(invoice.id, { method, account, pin }, user.name)
    if ("error" in result) {
      setError(result.error)
      return
    }
    toast.success(`${invoice.invoiceNo} paid. Receipt ${result.payment.receiptNo}.`)
    onPaid(result.payment)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={pay} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Pay {formatTaka(invoice.amount)}</DialogTitle>
            <DialogDescription>
              {invoice.invoiceNo} for {monthName(invoice.month)}. Sandbox: no money moves, and PIN {SANDBOX_PIN} pays.
            </DialogDescription>
          </DialogHeader>
          <FilterField
            label="Pay with"
            value={method}
            onChange={(v) => {
              setMethod(v as OnlineSaasMethod)
              setError("")
            }}
            options={onlineSaasMethods.map((m) => ({ value: m, label: m }))}
          />
          {wallet && (
            <TextField
              label={`${method} wallet number`}
              inputMode="tel"
              placeholder="01XXXXXXXXX"
              value={account}
              onChange={setAccount}
            />
          )}
          <TextField label={wallet ? "PIN" : "OTP"} type="password" autoComplete="off" value={pin} onChange={setPin} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Pay {formatTaka(invoice.amount)}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
