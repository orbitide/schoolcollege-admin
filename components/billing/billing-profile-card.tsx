"use client"

import * as React from "react"
import { toast } from "sonner"

import { TextField } from "@/components/settings/settings-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  billToOf,
  billingFallback,
  billingProfileErrors,
  blankBillingProfile,
  saveBillingProfile,
  useBillingProfile,
  type BillingProfile,
  type BillingProfileInput,
} from "@/lib/billing-profiles"
import { useCurrentUser } from "@/lib/current-user"
import type { Institute } from "@/lib/institutes"

const fields: { key: keyof BillingProfileInput; label: string; wide?: boolean; type?: string }[] = [
  { key: "billingName", label: "Billing Name" },
  { key: "contactPerson", label: "Contact Person" },
  { key: "email", label: "Billing Email", type: "email" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Billing Address", wide: true },
  { key: "bin", label: "BIN" },
]

// An institute's "Bill to" details. A blank field uses the institute's
// profile, shown as the placeholder. Read-only without `editable`.
export function BillingProfileCard({ institute, editable }: { institute: Institute; editable: boolean }) {
  const profile = useBillingProfile(institute.id)
  return editable ? (
    <ProfileForm key={profile?.modifiedAt ?? "new"} institute={institute} profile={profile} />
  ) : (
    <ProfileView institute={institute} profile={profile} />
  )
}

const description = "Printed as “Bill to” on new invoices. Invoices already issued keep their details."

function ProfileView({ institute, profile }: { institute: Institute; profile: BillingProfile | undefined }) {
  const billTo = billToOf(institute, profile)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing Details</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className={f.wide ? "grid gap-0.5 sm:col-span-2" : "grid gap-0.5"}>
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd>{billTo[f.key] || "—"}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

function ProfileForm({ institute, profile }: { institute: Institute; profile: BillingProfile | undefined }) {
  const user = useCurrentUser()
  const saved = React.useMemo<BillingProfileInput>(
    () =>
      profile
        ? {
            billingName: profile.billingName,
            contactPerson: profile.contactPerson,
            email: profile.email,
            phone: profile.phone,
            address: profile.address,
            bin: profile.bin,
          }
        : blankBillingProfile,
    [profile]
  )
  const [draft, setDraft] = React.useState(saved)
  const [errors, setErrors] = React.useState<ReturnType<typeof billingProfileErrors>>({})
  const changed = JSON.stringify(draft) !== JSON.stringify(saved)
  const fallback = billingFallback(institute)

  function save(event: React.FormEvent) {
    event.preventDefault()
    const found = billingProfileErrors(draft)
    setErrors(found)
    if (Object.keys(found).length) {
      toast.error("Check the highlighted fields.")
      return
    }
    saveBillingProfile(institute.id, draft, user.name)
    toast.success("Billing details saved.")
  }

  return (
    <form onSubmit={save}>
      <Card>
        <CardHeader>
          <CardTitle>Billing Details</CardTitle>
          <CardDescription>{description} Leave a field blank to use the institute profile.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <TextField
              key={f.key}
              label={f.label}
              type={f.type}
              className={f.wide ? "sm:col-span-2" : undefined}
              placeholder={fallback[f.key] || (f.key === "bin" ? "Not registered" : undefined)}
              value={draft[f.key]}
              onChange={(value) => setDraft((d) => ({ ...d, [f.key]: value }))}
              error={errors[f.key]}
            />
          ))}
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t">
          <p className="text-xs text-muted-foreground">
            {profile
              ? `Last changed by ${profile.modifiedBy} on ${new Date(profile.modifiedAt).toLocaleString()}`
              : "Using the institute profile"}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!changed}
              onClick={() => {
                setDraft(saved)
                setErrors({})
              }}
            >
              Reset
            </Button>
            <Button type="submit" disabled={!changed}>
              Save
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  )
}
