"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { DISTRICTS_HREF } from "@/components/basic-settings/district-list"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useCurrentUser } from "@/lib/current-user"
import {
  addDistrict,
  isDuplicateDistrictBanglaName,
  isDuplicateDistrictName,
  updateDistrict,
  useDistrict,
} from "@/lib/districts"

// Legacy District/CreateEdit: name and Bangla name, both required and unique
// among districts not deleted. A new district goes last in rank.
export function DistrictForm({ id }: { id?: number }) {
  const router = useRouter()
  const user = useCurrentUser()
  const district = useDistrict(id ?? -1)
  const isNew = id == null
  const [name, setName] = React.useState(district?.name ?? "")
  const [nameBn, setNameBn] = React.useState(district?.nameBn ?? "")
  const [errors, setErrors] = React.useState<{ name?: string; nameBn?: string }>({})
  const nameId = React.useId()
  const nameBnId = React.useId()

  if (!isNew && (!district || district.status === "Deleted")) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">No district found</h2>
        <p className="text-sm text-muted-foreground">It may have been deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={DISTRICTS_HREF}>Back to districts</Link>
        </Button>
      </div>
    )
  }

  function save(andNew: boolean) {
    const next = {
      name: !name.trim()
        ? "Name is required."
        : isDuplicateDistrictName(name, id)
          ? "District name won't be duplicate."
          : undefined,
      nameBn: !nameBn.trim()
        ? "Bangla name is required."
        : isDuplicateDistrictBanglaName(nameBn, id)
          ? "District Bangla name won't be duplicate."
          : undefined,
    }
    setErrors(next)
    if (next.name || next.nameBn) return
    if (isNew) {
      addDistrict({ name, nameBn }, user.name)
      toast.success("District added successfully")
    } else {
      updateDistrict(id, { name, nameBn }, user.name)
      toast.success("District updated successfully")
    }
    if (andNew) {
      setName("")
      setNameBn("")
    } else {
      router.push(DISTRICTS_HREF)
    }
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6"
      onSubmit={(event) => {
        event.preventDefault()
        save(false)
      }}
    >
      <Card className="max-w-3xl">
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{isNew ? "Add District" : "Edit District"}</CardTitle>
            <CardDescription>
              {isNew ? "Create a new district" : `Update ${district?.name}`}, shared by every
              institute.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={DISTRICTS_HREF}>Manage district</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor={nameId}>
              Name
              <span className="text-destructive" aria-hidden>
                *
              </span>
            </FieldLabel>
            <Input
              id={nameId}
              value={name}
              placeholder="Enter district name"
              aria-invalid={!!errors.name}
              onChange={(event) => setName(event.target.value)}
            />
            <FieldError>{errors.name}</FieldError>
          </Field>
          <Field data-invalid={!!errors.nameBn}>
            <FieldLabel htmlFor={nameBnId}>
              Bangla Name
              <span className="text-destructive" aria-hidden>
                *
              </span>
            </FieldLabel>
            <Input
              id={nameBnId}
              value={nameBn}
              placeholder="Enter district bangla name"
              aria-invalid={!!errors.nameBn}
              onChange={(event) => setNameBn(event.target.value)}
            />
            <FieldError>{errors.nameBn}</FieldError>
          </Field>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button asChild type="button" variant="outline">
            <Link href={DISTRICTS_HREF}>Back</Link>
          </Button>
          {isNew && (
            <Button type="button" variant="secondary" onClick={() => save(true)}>
              Save and new
            </Button>
          )}
          <Button type="submit">{isNew ? "Save" : "Update"}</Button>
        </CardFooter>
      </Card>
    </form>
  )
}
