"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"
import { toast } from "sonner"

import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { isPlatformAdmin, useCurrentUser } from "@/lib/current-user"
import {
  addAdminUser,
  adminUserErrors,
  saveUserInstitutes,
  updateAdminUser,
  useAdminUsers,
  useUserInstitutes,
  userRoles,
  type AdminUser,
  type AdminUserInput,
  type UserRole,
} from "@/lib/global-settings"
import { useInstitutes } from "@/lib/institutes-store"

const LIST_HREF = "/users"

// Add or edit an admin-panel user: who they are, their role, and (for
// anyone but platform staff) the institutes they may work with, saved as
// their User Institutes.
export function UserForm({ userId }: { userId?: number }) {
  const users = useAdminUsers()
  const existing = userId == null ? undefined : users.find((u) => u.id === userId)

  if (userId != null && !existing) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">User not found</h2>
        <p className="text-sm text-muted-foreground">They may have been deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={LIST_HREF}>Back to users</Link>
        </Button>
      </div>
    )
  }
  return <FormBody key={existing?.id ?? "new"} existing={existing} />
}

function FormBody({ existing }: { existing?: AdminUser }) {
  const router = useRouter()
  const me = useCurrentUser()
  const institutes = useInstitutes()
  const links = useUserInstitutes()
  const [name, setName] = React.useState(existing?.name ?? "")
  const [email, setEmail] = React.useState(existing?.email ?? "")
  const [mobile, setMobile] = React.useState(existing?.mobile ?? "")
  const [role, setRole] = React.useState<UserRole>(existing?.role ?? "Institute Admin")
  const [ticked, setTicked] = React.useState(
    () =>
      new Set(
        existing ? links.filter((l) => l.userId === existing.id && l.status === "Active").map((l) => l.instituteId) : []
      )
  )
  const [errors, setErrors] = React.useState<ReturnType<typeof adminUserErrors> & { institutes?: string }>({})
  const self = existing?.id === me.id
  const platform = isPlatformAdmin({ role })
  const sorted = [...institutes].sort((a, b) => a.name.localeCompare(b.name))

  function toggle(id: number, on: boolean) {
    setTicked((current) => {
      const next = new Set(current)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function save(event: React.FormEvent) {
    event.preventDefault()
    const input: AdminUserInput = { name, email, mobile, role }
    const found: typeof errors = adminUserErrors(input, existing?.id)
    if (!platform && ticked.size === 0) found.institutes = "Tick at least one institute this user works with."
    setErrors(found)
    if (Object.keys(found).length) {
      toast.error("Check the highlighted fields.")
      return
    }
    const saved = existing ?? addAdminUser(input, me.name)
    if (existing) updateAdminUser(existing.id, input, me.name)
    // Platform staff work with every institute, so they keep no links.
    saveUserInstitutes(saved.id, platform ? [] : [...ticked], institutes.map((i) => i.id), me.name)
    toast.success(existing ? `${input.name.trim()} saved` : `${input.name.trim()} added`)
    router.push(LIST_HREF)
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div>
        <Button asChild variant="link" className="h-auto px-0 text-muted-foreground">
          <Link href={LIST_HREF}>
            <ArrowLeftIcon data-icon="inline-start" />
            Users
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">{existing ? `Edit ${existing.name}` : "Add user"}</h2>
      </div>

      <div className="grid gap-4 md:gap-6 @4xl/main:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              {existing
                ? "Sign-in details. Passwords are set by the user through the sign-in email."
                : "The user gets an email to set their password once the API is connected."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field data-invalid={!!errors.name || undefined}>
              <FieldLabel htmlFor="user-name">Name</FieldLabel>
              <Input id="user-name" value={name} onChange={(e) => setName(e.target.value)} />
              <FieldError>{errors.name}</FieldError>
            </Field>
            <Field data-invalid={!!errors.email || undefined}>
              <FieldLabel htmlFor="user-email">Email</FieldLabel>
              <Input id="user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <FieldError>{errors.email}</FieldError>
            </Field>
            <Field data-invalid={!!errors.mobile || undefined}>
              <FieldLabel htmlFor="user-mobile">Mobile</FieldLabel>
              <Input
                id="user-mobile"
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
              <FieldError>{errors.mobile}</FieldError>
            </Field>
            <div className="grid gap-2">
              <FilterField
                label="Role"
                required
                value={role}
                onChange={(v) => setRole(v as UserRole)}
                options={userRoles.map((r) => ({ value: r, label: r }))}
                disabled={self}
              />
              {self && <FieldDescription>You can&apos;t change your own role.</FieldDescription>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Institutes</CardTitle>
            <CardDescription>
              {platform
                ? "Platform staff work with every institute."
                : "The institutes this user may work with. Their role decides what they can do there."}
            </CardDescription>
          </CardHeader>
          {!platform && (
            <CardContent className="grid gap-3">
              <div className="grid max-h-80 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
                {sorted.map((institute) => (
                  <label key={institute.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={ticked.has(institute.id)}
                      onCheckedChange={(checked) => toggle(institute.id, checked === true)}
                    />
                    <span className="truncate">{institute.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{ticked.size} selected</p>
              {errors.institutes && <p className="text-sm text-destructive">{errors.institutes}</p>}
            </CardContent>
          )}
        </Card>
      </div>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background px-4 py-3 lg:-mx-6 lg:px-6">
        <Button asChild variant="outline">
          <Link href={LIST_HREF}>Cancel</Link>
        </Button>
        <Button type="submit">{existing ? "Save changes" : "Add user"}</Button>
      </div>
    </form>
  )
}
