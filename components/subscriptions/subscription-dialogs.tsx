"use client"

import * as React from "react"
import { PrinterIcon } from "lucide-react"
import { toast } from "sonner"

import { PrintArea } from "@/components/reports/print-area"
import { InvoiceSheet } from "@/components/subscriptions/invoice-sheet"
import { InvoiceStateBadge } from "@/components/subscriptions/invoice-state-badge"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatTaka, isoDate, monthName, useBillingSettings } from "@/lib/billing"
import { useCurrentUser } from "@/lib/current-user"
import { formatDate, type Institute } from "@/lib/institutes"
import { invoiceState, type SaasInvoice } from "@/lib/saas-invoices"
import { recordManualPayment, saasPaymentMethods, type SaasPaymentMethod } from "@/lib/saas-payments"
import {
  customRatesErrors,
  extendTrial,
  setCustomRates,
  type Subscription,
} from "@/lib/subscriptions"

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void }

const rateOrNull = (value: string) => (value.trim() === "" ? null : Number(value))

// An institute's own per-student rates; a blank rate keeps the platform's.
export function CustomRatesDialog({
  open,
  onOpenChange,
  ...props
}: DialogProps & { institute: Institute; subscription: Subscription }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <CustomRatesForm {...props} close={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

// The dialog's body; it mounts each time the dialog opens, so it starts
// from the saved rates.
function CustomRatesForm({
  institute,
  subscription,
  close,
}: { institute: Institute; subscription: Subscription; close: () => void }) {
  const onOpenChange = (open: boolean) => !open && close()
  const settings = useBillingSettings()
  const user = useCurrentUser()
  const [lower, setLower] = React.useState(
    subscription.customLowerRate == null ? "" : String(subscription.customLowerRate)
  )
  const [upper, setUpper] = React.useState(
    subscription.customUpperRate == null ? "" : String(subscription.customUpperRate)
  )
  const [notes, setNotes] = React.useState(subscription.notes)
  const [errors, setErrors] = React.useState<ReturnType<typeof customRatesErrors>>({})

  function save(event: React.FormEvent) {
    event.preventDefault()
    const input = { customLowerRate: rateOrNull(lower), customUpperRate: rateOrNull(upper), notes: notes.trim() }
    const found = customRatesErrors(input)
    setErrors(found)
    if (Object.keys(found).length) return
    setCustomRates(institute.id, input, user.name)
    toast.success(`Rates saved for ${institute.name}`)
    onOpenChange(false)
  }

  return (
    <form onSubmit={save} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Custom rates</DialogTitle>
        <DialogDescription>
          {institute.name}. Leave a rate blank to use the default. Applies from the next invoice.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!errors.customLowerRate || undefined}>
          <FieldLabel htmlFor="custom-lower">Lower rate (৳)</FieldLabel>
          <Input
            id="custom-lower"
            type="number"
            min={0}
            step="0.01"
            placeholder={`Default ${settings.lowerRate}`}
            value={lower}
            onChange={(e) => setLower(e.target.value)}
          />
          <FieldDescription>Under {settings.threshold.toLocaleString()} students</FieldDescription>
          <FieldError>{errors.customLowerRate}</FieldError>
        </Field>
        <Field data-invalid={!!errors.customUpperRate || undefined}>
          <FieldLabel htmlFor="custom-upper">Upper rate (৳)</FieldLabel>
          <Input
            id="custom-upper"
            type="number"
            min={0}
            step="0.01"
            placeholder={`Default ${settings.upperRate}`}
            value={upper}
            onChange={(e) => setUpper(e.target.value)}
          />
          <FieldDescription>{settings.threshold.toLocaleString()} students or more</FieldDescription>
          <FieldError>{errors.customUpperRate}</FieldError>
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="custom-notes">Notes</FieldLabel>
        <Textarea
          id="custom-notes"
          rows={2}
          placeholder="Why this institute has its own rates"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit">Save rates</Button>
      </DialogFooter>
    </form>
  )
}

const trialExtensions = [7, 14, 30].map((d) => ({ value: String(d), label: `${d} days` }))

export function ExtendTrialDialog({
  institute,
  subscription,
  open,
  onOpenChange,
}: DialogProps & { institute: Institute; subscription: Subscription }) {
  const user = useCurrentUser()
  const [days, setDays] = React.useState("14")

  function save() {
    extendTrial(institute.id, Number(days), user.name)
    toast.success(`Trial extended by ${days} days`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Extend trial</DialogTitle>
          <DialogDescription>
            {institute.name}.{" "}
            {subscription.trialEndsAt
              ? `The trial ends ${formatDate(subscription.trialEndsAt)}.`
              : "No trial end is set; the extension starts today."}
          </DialogDescription>
        </DialogHeader>
        <FilterField label="Extend by" value={days} onChange={setDays} options={trialExtensions} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Extend trial</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function MarkPaidDialog({
  open,
  onOpenChange,
  ...props
}: DialogProps & { invoice: SaasInvoice; instituteName: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <MarkPaidForm {...props} close={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function MarkPaidForm({
  invoice,
  instituteName,
  close,
}: { invoice: SaasInvoice; instituteName: string; close: () => void }) {
  const onOpenChange = (open: boolean) => !open && close()
  const user = useCurrentUser()
  const [paidAt, setPaidAt] = React.useState(isoDate())
  const [method, setMethod] = React.useState<SaasPaymentMethod>("Bank transfer")
  const [reference, setReference] = React.useState("")
  const [error, setError] = React.useState("")

  function save(event: React.FormEvent) {
    event.preventDefault()
    if (!paidAt) {
      setError("Enter the payment date.")
      return
    }
    if (paidAt > isoDate()) {
      setError("The payment date can't be in the future.")
      return
    }
    if (!recordManualPayment(invoice.id, { paidAt, method, reference }, user.name)) {
      toast.error("Only a due invoice can be marked paid.")
      return
    }
    toast.success(`${invoice.invoiceNo} marked paid. Receipt issued.`)
    onOpenChange(false)
  }

  return (
    <form onSubmit={save} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Mark {invoice.invoiceNo} paid</DialogTitle>
        <DialogDescription>
          {instituteName} · {monthName(invoice.month)} · {formatTaka(invoice.amount)}
        </DialogDescription>
      </DialogHeader>
      <Field data-invalid={!!error || undefined}>
        <FieldLabel htmlFor="paid-at">Payment date</FieldLabel>
        <Input id="paid-at" type="date" value={paidAt} max={isoDate()} onChange={(e) => setPaidAt(e.target.value)} />
        <FieldError>{error}</FieldError>
      </Field>
      <FilterField
        label="Method"
        value={method}
        onChange={(v) => setMethod(v as SaasPaymentMethod)}
        options={saasPaymentMethods.map((m) => ({ value: m, label: m }))}
      />
      <Field>
        <FieldLabel htmlFor="paid-note">Reference</FieldLabel>
        <Input
          id="paid-note"
          placeholder="e.g. bKash TrxID, bank ref., cheque no."
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit">Mark paid</Button>
      </DialogFooter>
    </form>
  )
}

// An invoice as the institute receives it, with a Print button (one A4
// page, printed from this tab since the data lives in its memory).
export function InvoiceDialog({
  invoice,
  open,
  onOpenChange,
}: DialogProps & { invoice: SaasInvoice }) {
  const state = invoiceState(invoice)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {invoice.invoiceNo} <InvoiceStateBadge state={state} />
          </DialogTitle>
          <DialogDescription>Platform subscription for {monthName(invoice.month)}</DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-md border">
          <InvoiceSheet invoice={invoice} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <PrinterIcon data-icon="inline-start" />
            Print
          </Button>
        </DialogFooter>
        {open && (
          <PrintArea pageSize="A4 portrait" margin="10mm">
            <InvoiceSheet invoice={invoice} />
          </PrintArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
