"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useCurrentUser } from "@/lib/current-user"
import { ApiError } from "@/lib/http-client"
import {
  addUserRole,
  nextRoleRank,
  roleErrors,
  updateUserRole,
  useUserRoles,
  useUserRolesLoaded,
  type UserRoleInput,
  type UserRoleRecord,
} from "@/lib/user-roles"

const LIST_HREF = "/users/roles"

// Legacy Users/CreateEditRoles: New User Role / Update User Role with Name,
// Group, Description and Rank. Its permissions are set on the Permissions
// page.
export function RoleForm({ roleId }: { roleId?: number }) {
  const roles = useUserRoles()
  // Wait for the API's list: the rank default and "not found" depend on it.
  const loaded = useUserRolesLoaded()
  const existing = roleId == null ? undefined : roles.find((r) => r.id === roleId)
  const [formKey, setFormKey] = React.useState(0)

  if (!loaded) return null
  if (roleId != null && !existing) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Role not found</h2>
        <p className="text-sm text-muted-foreground">It may have been deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={LIST_HREF}>Back to roles</Link>
        </Button>
      </div>
    )
  }
  return <FormBody key={existing?.id ?? `new-${formKey}`} existing={existing} onSavedNew={() => setFormKey((k) => k + 1)} />
}

function FormBody({ existing, onSavedNew }: { existing?: UserRoleRecord; onSavedNew: () => void }) {
  const router = useRouter()
  const me = useCurrentUser()
  const [name, setName] = React.useState(existing?.name ?? "")
  const [group, setGroup] = React.useState(existing?.group ?? "")
  const [description, setDescription] = React.useState(existing?.description ?? "")
  const [rank, setRank] = React.useState(String(existing?.rank ?? nextRoleRank()))
  const [errors, setErrors] = React.useState<ReturnType<typeof roleErrors>>({})
  const isNew = !existing

  const [pending, setPending] = React.useState(false)

  async function save(andNew: boolean) {
    if (pending) return
    const input: UserRoleInput = { name, group, description, rank: Number(rank) }
    const found = roleErrors(input, existing?.id)
    setErrors(found)
    if (Object.keys(found).length) {
      toast.error("Please enter all required fields.")
      return
    }
    setPending(true)
    try {
      if (existing) {
        const role = await updateUserRole(existing.id, input, me.name)
        toast.success(`Role ${role.name} updated.`)
        router.push(LIST_HREF)
        return
      }
      const role = await addUserRole(input)
      toast.success(`Role ${role.name} saved. Set its permissions next.`)
      if (andNew) onSavedNew()
      else router.push(`/users/roles/${role.id}/permissions`)
    } catch (error) {
      // The API's own checks (e.g. a name taken meanwhile) come back per field.
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length) setErrors(error.fieldErrors)
      toast.error((error as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        save(false)
      }}
      className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6"
    >
      <div>
        <Button asChild variant="link" className="h-auto px-0 text-muted-foreground">
          <Link href={LIST_HREF}>
            <ArrowLeftIcon data-icon="inline-start" />
            Manage User Roles
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">{isNew ? "New User Role" : "Update User Role"}</h2>
      </div>

      <Card className="max-w-2xl">
        <CardContent className="grid gap-4">
          <Field data-invalid={!!errors.name || undefined}>
            <FieldLabel htmlFor="role-name">
              Name
              <span className="text-destructive" aria-hidden>
                *
              </span>
            </FieldLabel>
            <Input
              id="role-name"
              value={name}
              readOnly={existing?.builtIn}
              onChange={(e) => setName(e.target.value)}
            />
            {existing?.builtIn && <FieldDescription>A built-in role keeps its name.</FieldDescription>}
            <FieldError>{errors.name}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="role-group">Group</FieldLabel>
            <Input id="role-group" value={group} onChange={(e) => setGroup(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="role-description">Description</FieldLabel>
            <Input id="role-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field data-invalid={!!errors.rank || undefined}>
            <FieldLabel htmlFor="role-rank">Rank</FieldLabel>
            <Input
              id="role-rank"
              type="number"
              min={0}
              step={1}
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              className="w-32"
            />
            <FieldDescription>Orders the roles in role pickers.</FieldDescription>
            <FieldError>{errors.rank}</FieldError>
          </Field>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button asChild type="button" variant="outline">
            <Link href={LIST_HREF}>Back</Link>
          </Button>
          {isNew && (
            <Button type="button" variant="secondary" disabled={pending} onClick={() => save(true)}>
              Save and new
            </Button>
          )}
          <Button type="submit" disabled={pending}>{isNew ? "Save" : "Update"}</Button>
        </CardFooter>
      </Card>
    </form>
  )
}
