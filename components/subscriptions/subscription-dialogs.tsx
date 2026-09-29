"use client"

import * as React from "react"
import { toast } from "sonner"

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
import { invoiceState, markInvoicePaid, type SaasInvoice } from "@/lib/saas-invoices"
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
  const [note, setNote] = React.useState("")
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
    if (!markInvoicePaid(invoice.id, { paidAt, note }, user.name)) {
      toast.error("Only a due invoice can be marked paid.")
      return
    }
    toast.success(`${invoice.invoiceNo} marked paid`)
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
      <Field>
        <FieldLabel htmlFor="paid-note">Payment reference</FieldLabel>
        <Input
          id="paid-note"
          placeholder="e.g. bKash TrxID, bank transfer ref."
          value={note}
          onChange={(e) => setNote(e.target.value)}
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

// An invoice as the institute would receive it.
export function InvoiceDialog({
  invoice,
  institute,
  open,
  onOpenChange,
}: DialogProps & { invoice: SaasInvoice; institute: Institute | undefined }) {
  const state = invoiceState(invoice)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {invoice.invoiceNo} <InvoiceStateBadge state={state} />
          </DialogTitle>
          <DialogDescription>Platform subscription for {monthName(invoice.month)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 text-sm">
          <div className="grid gap-0.5">
            <span className="font-medium">{institute?.name ?? `Institute #${invoice.instituteId}`}</span>
            {institute && (
              <span className="text-muted-foreground">
                {institute.address || institute.city} · {institute.email}
              </span>
            )}
          </div>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 text-right font-medium">Students</th>
                  <th className="px-3 py-2 text-right font-medium">Rate</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-2">All features plan, active students at month end</td>
                  <td className="px-3 py-2 text-right tabular-nums">{invoice.studentCount.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatTaka(invoice.rate)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatTaka(invoice.amount)}</td>
                </tr>
                <tr className="border-t bg-muted/40 font-semibold">
                  <td className="px-3 py-2" colSpan={3}>
                    Total
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatTaka(invoice.amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <dt className="text-muted-foreground">Issued</dt>
            <dd>{formatDate(invoice.issuedAt)}</dd>
            <dt className="text-muted-foreground">Due</dt>
            <dd>{formatDate(invoice.dueDate)}</dd>
            {invoice.paidAt && (
              <>
                <dt className="text-muted-foreground">Paid</dt>
                <dd>
                  {formatDate(invoice.paidAt)}
                  {invoice.paymentNote && ` · ${invoice.paymentNote}`}
                </dd>
              </>
            )}
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  )
}
