"use client"

import * as React from "react"
import { toast } from "sonner"

import { SaveFooter, TextField } from "@/components/settings/settings-fields"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import {
  platformBillingErrors,
  updatePlatformBillingInfo,
  usePlatformBillingInfo,
  type PlatformBillingInfo,
  type PlatformBillingInput,
} from "@/lib/billing"
import { useCurrentUser } from "@/lib/current-user"

const toDraft = (info: PlatformBillingInfo): PlatformBillingInput => ({
  companyName: info.companyName,
  address: info.address,
  bin: info.bin,
  email: info.email,
  phone: info.phone,
  paymentInstructions: info.paymentInstructions,
  invoiceFooter: info.invoiceFooter,
})

// Who bills the institutes: the "From" on every invoice. Rates are on
// Pricing; each institute's own details are on its Billing page.
export function PlatformBillingForm() {
  const info = usePlatformBillingInfo()
  return <FormBody key={info.modifiedAt} info={info} />
}

function FormBody({ info }: { info: PlatformBillingInfo }) {
  const user = useCurrentUser()
  const saved = React.useMemo(() => toDraft(info), [info])
  const [draft, setDraft] = React.useState(saved)
  const [errors, setErrors] = React.useState<ReturnType<typeof platformBillingErrors>>({})
  const changed = JSON.stringify(draft) !== JSON.stringify(saved)
  const set = (key: keyof PlatformBillingInput) => (value: string) => setDraft((d) => ({ ...d, [key]: value }))
  const instructionsId = React.useId()
  const footerId = React.useId()

  function save(event: React.FormEvent) {
    event.preventDefault()
    const found = platformBillingErrors(draft)
    setErrors(found)
    if (Object.keys(found).length) {
      toast.error("Check the highlighted fields.")
      return
    }
    updatePlatformBillingInfo(draft, user.name)
    toast.success("Billing details saved. Invoices issued from now on use them.")
  }

  return (
    <form onSubmit={save}>
      <Card>
        <CardHeader>
          <CardTitle>Billing Details</CardTitle>
          <CardDescription>
            Printed as &ldquo;From&rdquo; on every invoice to institutes. Invoices already issued keep the details
            they were issued with.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Company Name"
            required
            value={draft.companyName}
            onChange={set("companyName")}
            error={errors.companyName}
          />
          <TextField
            label="BIN"
            value={draft.bin}
            onChange={set("bin")}
            description="VAT registration number, if registered"
          />
          <TextField
            label="Address"
            required
            className="sm:col-span-2"
            value={draft.address}
            onChange={set("address")}
            error={errors.address}
          />
          <TextField
            label="Billing Email"
            required
            type="email"
            value={draft.email}
            onChange={set("email")}
            error={errors.email}
          />
          <TextField
            label="Phone"
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            value={draft.phone}
            onChange={set("phone")}
            error={errors.phone}
          />
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor={instructionsId}>Payment Instructions</FieldLabel>
            <Textarea
              id={instructionsId}
              rows={3}
              value={draft.paymentInstructions}
              onChange={(e) => set("paymentInstructions")(e.target.value)}
            />
            <FieldDescription>Bank or bKash details for paying by hand. Shown on unpaid invoices.</FieldDescription>
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor={footerId}>Invoice Footer</FieldLabel>
            <Textarea
              id={footerId}
              rows={2}
              value={draft.invoiceFooter}
              onChange={(e) => set("invoiceFooter")(e.target.value)}
            />
          </Field>
        </CardContent>
        <SaveFooter
          modifiedBy={info.modifiedBy}
          modifiedAt={info.modifiedAt}
          changed={changed}
          onReset={() => {
            setDraft(saved)
            setErrors({})
          }}
        />
      </Card>
    </form>
  )
}
