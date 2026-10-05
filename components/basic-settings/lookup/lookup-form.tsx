"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"
import { toast } from "sonner"

import type { LookupErrors, LookupPage } from "@/components/basic-settings/lookup/lookup-page"
import { lookupPages, type LookupKey } from "@/components/basic-settings/lookups"
import { NoAccess } from "@/components/no-access"
import { PageLoader } from "@/components/page-loader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { ApiError } from "@/lib/http-client"
import type { LookupRow } from "@/lib/lookup-store"

// The list a page returns to: where it was opened from (`?returnTo=`), else the lookup's Manage page.
export function useLookupListHref(segment: string) {
  const returnTo = useSearchParams().get("returnTo")
  const base = `/basic-settings/${segment}`
  return returnTo?.startsWith(base) ? returnTo : base
}

// Legacy <Lookup> CreateEdit: a new row (`id` absent) or a row's edit.
export function LookupForm({ lookup, id }: { lookup: LookupKey; id?: number }) {
  const page = lookupPages[lookup]
  if (id === undefined) return <LookupFormBody page={page} />
  return <EditLookup page={page} id={id} />
}

function EditLookup({ page, id }: { page: LookupPage; id: number }) {
  const { row, denied } = page.store.useDetails(id)
  const listHref = useLookupListHref(page.segment)

  if (denied) return <NoAccess />
  if (row === undefined) return <PageLoader label={`Loading ${page.singular.toLowerCase()}`} />
  if (!row || row.recordStatus === "Deleted")
    return (
      <div className="flex flex-col items-start gap-2 p-6">
        <p className="text-sm text-muted-foreground">No {page.singular} found.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>Back to {page.plural.toLowerCase()}</Link>
        </Button>
      </div>
    )
  return <LookupFormBody page={page} row={row} />
}

function LookupFormBody({ page, row }: { page: LookupPage; row?: LookupRow }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const listHref = useLookupListHref(page.segment)
  const institutes = useAccessibleInstitutes()
  const preset = Number(searchParams.get("institute")) || undefined
  const [instituteId, setInstituteId] = React.useState(() =>
    String(
      row?.instituteId ??
        (institutes.length === 1 ? institutes[0].id : institutes.find((institute) => institute.id === preset)?.id ?? "")
    )
  )
  const [name, setName] = React.useState(row?.name ?? "")
  const fields = page.form.useFields(row)
  const [errors, setErrors] = React.useState<LookupErrors>({})
  const [pending, setPending] = React.useState(false)
  const institute = institutes.find((i) => String(i.id) === instituteId)
  const lower = page.singular.toLowerCase()

  async function save(andNew: boolean) {
    const next: LookupErrors = {
      instituteId: instituteId ? undefined : "Select the institute.",
      name: name.trim() ? undefined : page.form.nameRequired,
      ...fields.validate(institute),
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return

    setPending(true)
    try {
      const input = { instituteId: Number(instituteId), name: name.trim(), ...fields.values() }
      if (row) await page.store.update(row.id, input)
      else await page.store.add(input)
      toast.success(`${page.singular} ${row ? "Updated" : "Added"} Successfully`)
      if (andNew) {
        setName("")
        fields.reset()
        setErrors({})
      } else {
        router.push(listHref)
      }
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length) setErrors(error.fieldErrors)
      else toast.error((error as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void save(false)
      }}
      noValidate
      className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6"
    >
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={listHref}>
          <ArrowLeftIcon data-icon="inline-start" />
          {page.plural}
        </Link>
      </Button>

      <h3 className="text-xl font-semibold tracking-tight">{row ? `Edit ${lower}` : `Add ${lower}`}</h3>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{page.singular} details</CardTitle>
          <CardDescription>{page.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Legacy shows the institute only to users with more than one; it can't change on edit. */}
          {institutes.length > 1 && (
            <Field data-invalid={!!errors.instituteId}>
              <FieldLabel htmlFor="instituteId">Institute</FieldLabel>
              {row ? (
                <Input id="instituteId" value={institute?.name ?? "—"} disabled />
              ) : (
                <Select value={instituteId} onValueChange={setInstituteId}>
                  <SelectTrigger id="instituteId" className="w-full" aria-invalid={!!errors.instituteId}>
                    <SelectValue placeholder="Select institute" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {institutes.map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
              <FieldError>{errors.instituteId}</FieldError>
            </Field>
          )}
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" value={name} aria-invalid={!!errors.name} onChange={(event) => setName(event.target.value)} />
            <FieldError>{errors.name}</FieldError>
          </Field>
          {fields.render(errors, institute)}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background px-4 py-3 lg:-mx-6 lg:px-6">
        <Button asChild variant="outline">
          <Link href={listHref}>Cancel</Link>
        </Button>
        {!row && (
          <Button type="button" variant="secondary" disabled={pending} onClick={() => void save(true)}>
            Save and new
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {row ? "Save changes" : `Add ${lower}`}
        </Button>
      </div>
    </form>
  )
}
