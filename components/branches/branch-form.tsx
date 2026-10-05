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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { ApiError } from "@/lib/http-client"
import { addBranch, updateBranch, useBranchDetails, type BranchRow } from "@/lib/branches-store"

type Errors = { instituteId?: string; name?: string; code?: string; address?: string }

// The list a form returns to: where it was opened from (`?returnTo=`), else Branch Manage.
export function useBranchListHref() {
  const returnTo = useSearchParams().get("returnTo")
  return returnTo?.startsWith("/basic-settings/branches") ? returnTo : "/basic-settings/branches"
}

// Legacy Branch CreateEdit: a new branch (`id` absent) or a branch's edit.
export function BranchForm({ id }: { id?: number }) {
  if (id === undefined) return <BranchFormBody />
  return <EditBranch id={id} />
}

function EditBranch({ id }: { id: number }) {
  const { branch, denied } = useBranchDetails(id)
  const listHref = useBranchListHref()

  if (denied) return <NoAccess />
  if (branch === undefined) return <PageLoader label="Loading branch" />
  if (!branch || branch.recordStatus === "Deleted")
    return (
      <div className="flex flex-col items-start gap-2 p-6">
        <p className="text-sm text-muted-foreground">No Branch found.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>Back to branches</Link>
        </Button>
      </div>
    )
  return <BranchFormBody branch={branch} />
}

function BranchFormBody({ branch }: { branch?: BranchRow }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const listHref = useBranchListHref()
  const institutes = useAccessibleInstitutes()
  const preset = Number(searchParams.get("institute")) || undefined
  const [instituteId, setInstituteId] = React.useState(() =>
    String(
      branch?.instituteId ??
        (institutes.length === 1 ? institutes[0].id : institutes.find((institute) => institute.id === preset)?.id ?? "")
    )
  )
  const [name, setName] = React.useState(branch?.name ?? "")
  const [code, setCode] = React.useState(branch?.code ?? "")
  const [address, setAddress] = React.useState(branch?.address ?? "")
  const [errors, setErrors] = React.useState<Errors>({})
  const [pending, setPending] = React.useState(false)
  const institute = institutes.find((i) => String(i.id) === instituteId)

  async function save(andNew: boolean) {
    const next: Errors = {
      instituteId: instituteId ? undefined : "Select the institute.",
      name: name.trim() ? undefined : "Enter Branch Name",
      code: code.trim() ? undefined : "Enter Branch Code",
    }
    setErrors(next)
    if (next.instituteId || next.name || next.code) return

    setPending(true)
    try {
      const input = { instituteId: Number(instituteId), name: name.trim(), code: code.trim(), address: address.trim() }
      if (branch) await updateBranch(branch.id, input)
      else await addBranch(input)
      toast.success(branch ? "Branch Updated Successfully" : "Branch Added Successfully")
      if (andNew) {
        setName("")
        setCode("")
        setAddress("")
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
          Branches
        </Link>
      </Button>

      <h3 className="text-xl font-semibold tracking-tight">{branch ? "Edit branch" : "Add branch"}</h3>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Branch details</CardTitle>
          <CardDescription>Campuses of the institute. Students, classes and buildings belong to a branch.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Legacy shows the institute only to users with more than one; it can't change on edit. */}
          {institutes.length > 1 && (
            <Field data-invalid={!!errors.instituteId}>
              <FieldLabel htmlFor="instituteId">Institute</FieldLabel>
              {branch ? (
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
          <Field data-invalid={!!errors.code}>
            <FieldLabel htmlFor="code">Code</FieldLabel>
            <Input id="code" value={code} aria-invalid={!!errors.code} onChange={(event) => setCode(event.target.value)} />
            <FieldError>{errors.code}</FieldError>
          </Field>
          <Field data-invalid={!!errors.address} className="sm:col-span-2">
            <FieldLabel htmlFor="address">Address</FieldLabel>
            <Textarea
              id="address"
              value={address}
              aria-invalid={!!errors.address}
              onChange={(event) => setAddress(event.target.value)}
            />
            <FieldError>{errors.address}</FieldError>
          </Field>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background px-4 py-3 lg:-mx-6 lg:px-6">
        <Button asChild variant="outline">
          <Link href={listHref}>Cancel</Link>
        </Button>
        {!branch && (
          <Button type="button" variant="secondary" disabled={pending} onClick={() => void save(true)}>
            Save and new
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {branch ? "Save changes" : "Add branch"}
        </Button>
      </div>
    </form>
  )
}
