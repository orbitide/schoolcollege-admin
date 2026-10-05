"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"
import { toast } from "sonner"

import { NoAccess } from "@/components/no-access"
import { PageLoader } from "@/components/page-loader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { ApiError } from "@/lib/http-client"
import { addShift, updateShift, useShiftDetails, type ShiftRow } from "@/lib/shifts-store"

type Errors = { instituteId?: string; name?: string }

// The list a form returns to: where it was opened from (`?returnTo=`), else Shift Manage.
export function useShiftListHref() {
  const returnTo = useSearchParams().get("returnTo")
  return returnTo?.startsWith("/basic-settings/shifts") ? returnTo : "/basic-settings/shifts"
}

// Legacy Shift CreateEdit: a new shift (`id` absent) or a shift's edit.
export function ShiftForm({ id }: { id?: number }) {
  if (id === undefined) return <ShiftFormBody />
  return <EditShift id={id} />
}

function EditShift({ id }: { id: number }) {
  const { shift, denied } = useShiftDetails(id)
  const listHref = useShiftListHref()

  if (denied) return <NoAccess />
  if (shift === undefined) return <PageLoader label="Loading shift" />
  if (!shift || shift.recordStatus === "Deleted")
    return (
      <div className="flex flex-col items-start gap-2 p-6">
        <p className="text-sm text-muted-foreground">Invalid Shift.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>Back to shifts</Link>
        </Button>
      </div>
    )
  return <ShiftFormBody shift={shift} />
}

function ShiftFormBody({ shift }: { shift?: ShiftRow }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const listHref = useShiftListHref()
  const institutes = useAccessibleInstitutes()
  const preset = Number(searchParams.get("institute")) || undefined
  const [instituteId, setInstituteId] = React.useState(() =>
    String(
      shift?.instituteId ??
        (institutes.length === 1 ? institutes[0].id : institutes.find((institute) => institute.id === preset)?.id ?? "")
    )
  )
  const [name, setName] = React.useState(shift?.name ?? "")
  const [errors, setErrors] = React.useState<Errors>({})
  const [pending, setPending] = React.useState(false)
  const institute = institutes.find((i) => String(i.id) === instituteId)

  async function save(andNew: boolean) {
    const next: Errors = {
      instituteId: instituteId ? undefined : "Select the institute.",
      name: name.trim() ? undefined : "Insert Shift Name.",
    }
    setErrors(next)
    if (next.instituteId || next.name) return

    setPending(true)
    try {
      const input = { instituteId: Number(instituteId), name: name.trim() }
      if (shift) await updateShift(shift.id, input)
      else await addShift(input)
      toast.success(shift ? "Shift Updated Successfully" : "Shift Added Successfully")
      if (andNew) {
        setName("")
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
          Shifts
        </Link>
      </Button>

      <h3 className="text-xl font-semibold tracking-tight">{shift ? "Edit shift" : "Add shift"}</h3>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Shift details</CardTitle>
          <CardDescription>Daily sessions such as Morning and Day, used by classes and routines.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Legacy shows the institute only to users with more than one; it can't change on edit. */}
          {institutes.length > 1 && (
            <Field data-invalid={!!errors.instituteId}>
              <FieldLabel htmlFor="instituteId">Institute</FieldLabel>
              {shift ? (
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
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background px-4 py-3 lg:-mx-6 lg:px-6">
        <Button asChild variant="outline">
          <Link href={listHref}>Cancel</Link>
        </Button>
        {!shift && (
          <Button type="button" variant="secondary" disabled={pending} onClick={() => void save(true)}>
            Save and new
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {shift ? "Save changes" : "Add shift"}
        </Button>
      </div>
    </form>
  )
}
