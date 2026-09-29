"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"
import { toast } from "sonner"

import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { isPlatformAdmin, useCurrentUser } from "@/lib/current-user"
import {
  addAdminUser,
  adminUserErrors,
  updateAdminUser,
  useAdminUsers,
  userGenders,
  type AdminUser,
  type AdminUserInput,
  type UserGender,
  type UserRole,
} from "@/lib/global-settings"
import { SUPER_ADMIN_ROLE, useUserRoleNames } from "@/lib/user-roles"

const LIST_HREF = "/users"

// Legacy UserViewModel's default birth date: 20 years ago today.
function defaultDateOfBirth() {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 20)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Legacy Users/CreateEdit (New User) and Users/Update: account details, the
// super admin only switches (confirmations, Is Superadmin, two-factor) and
// the role. As in legacy, the institutes a user works with are linked
// separately in Basic Settings › User Institutes.
export function UserForm({ userId }: { userId?: number }) {
  const users = useAdminUsers()
  const existing = userId == null ? undefined : users.find((u) => u.id === userId)

  if (userId != null && !existing) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">User not found.</h2>
        <p className="text-sm text-muted-foreground">They may have been deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={LIST_HREF}>Back</Link>
        </Button>
      </div>
    )
  }
  return <FormBody key={existing?.id ?? "new"} existing={existing} />
}

type Errors = ReturnType<typeof adminUserErrors>

function FormBody({ existing }: { existing?: AdminUser }) {
  const router = useRouter()
  // The roles a user who isn't a super admin can hold (Manage User Roles);
  // Is Superadmin grants the other one.
  const instituteRoles = useUserRoleNames().filter((r) => r !== SUPER_ADMIN_ROLE)
  const me = useCurrentUser()
  const [userName, setUserName] = React.useState(existing?.userName ?? "")
  const [name, setName] = React.useState(existing?.name ?? "")
  const [gender, setGender] = React.useState<UserGender>(existing?.gender ?? "Male")
  const [dateOfBirth, setDateOfBirth] = React.useState(existing?.dateOfBirth ?? defaultDateOfBirth)
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [email, setEmail] = React.useState(existing?.email ?? "")
  const [emailConfirmed, setEmailConfirmed] = React.useState(existing?.emailConfirmed ?? false)
  const [mobile, setMobile] = React.useState(existing?.mobile ?? "")
  const [mobileConfirmed, setMobileConfirmed] = React.useState(existing?.mobileConfirmed ?? false)
  const [superAdmin, setSuperAdmin] = React.useState(existing ? isPlatformAdmin(existing) : false)
  const [twoFactorEnabled, setTwoFactorEnabled] = React.useState(existing?.twoFactorEnabled ?? false)
  const [role, setRole] = React.useState<UserRole | "">(existing && !isPlatformAdmin(existing) ? existing.role : "")
  const [forcePasswordChange, setForcePasswordChange] = React.useState(existing?.forcePasswordChange ?? false)
  const [sendEmail, setSendEmail] = React.useState(false)
  const [errors, setErrors] = React.useState<Errors>({})
  const ids = {
    userName: React.useId(),
    name: React.useId(),
    dateOfBirth: React.useId(),
    password: React.useId(),
    confirmPassword: React.useId(),
    email: React.useId(),
    mobile: React.useId(),
  }
  const self = existing?.id === me.id
  // Legacy shows the confirmation, Is Superadmin and two-factor switches to
  // super admins only.
  const meSuper = isPlatformAdmin(me)

  function save(event: React.FormEvent) {
    event.preventDefault()
    const input: AdminUserInput = {
      userName,
      name,
      gender,
      dateOfBirth,
      password,
      confirmPassword,
      email,
      emailConfirmed,
      mobile,
      mobileConfirmed,
      role: superAdmin ? SUPER_ADMIN_ROLE : role || "Institute Admin",
      twoFactorEnabled,
      forcePasswordChange,
    }
    const found: Errors = adminUserErrors(input, existing?.id)
    if (!superAdmin && !role) found.role = "Select the user's role."
    setErrors(found)
    if (Object.keys(found).length) {
      toast.error("Please enter all required fields.")
      return
    }
    // Keeps you signed in when you edit yourself.
    if (existing) updateAdminUser(existing.id, input, me.name, !self)
    else addAdminUser(input, me.name)
    toast.success(existing ? "User update successful." : "User created successfully.")
    if (sendEmail)
      toast.info(`The account email to ${input.email.trim()} goes out once the email service is connected.`)
    router.push(LIST_HREF)
  }

  const check = (
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
    options: {
      description?: string
      disabled?: boolean
      superOnly?: boolean
    } = {},
  ) => {
    const id = `${ids.userName}-${label.replace(/\W+/g, "-")}`
    return (
      <Field orientation="horizontal">
        <Checkbox
          id={id}
          checked={checked}
          disabled={options.disabled}
          onCheckedChange={(value) => onChange(value === true)}
        />
        <FieldContent>
          <FieldLabel htmlFor={id} className={options.superOnly ? "text-sky-700 dark:text-sky-400" : undefined}>
            {label}
          </FieldLabel>
          {options.description && <FieldDescription>{options.description}</FieldDescription>}
        </FieldContent>
      </Field>
    )
  }

  const required = (
    <span className="text-destructive" aria-hidden>
      *
    </span>
  )

  return (
    <form onSubmit={save} className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <h2 className="text-2xl font-semibold tracking-tight">{existing ? "Update User" : "New User"}</h2>

      <div className="grid items-start gap-4 md:gap-6 @4xl/main:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User</CardTitle>
            <CardDescription>
              {existing
                ? "The user name can't change. Leave the password blank to keep the current one."
                : "The user signs in with their email and this password."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.userName || undefined}>
              <FieldLabel htmlFor={ids.userName}>User Name {!existing && required}</FieldLabel>
              <Input
                id={ids.userName}
                value={userName}
                readOnly={!!existing}
                autoComplete="off"
                onChange={(e) => setUserName(e.target.value)}
              />
              <FieldError>{errors.userName}</FieldError>
            </Field>
            <Field data-invalid={!!errors.name || undefined}>
              <FieldLabel htmlFor={ids.name}>Full Name {required}</FieldLabel>
              <Input id={ids.name} value={name} onChange={(e) => setName(e.target.value)} />
              <FieldError>{errors.name}</FieldError>
            </Field>
            <FilterField
              label="Gender"
              value={gender}
              onChange={(v) => setGender(v as UserGender)}
              options={userGenders.map((g) => ({ value: g, label: g }))}
            />
            <Field data-invalid={!!errors.dateOfBirth || undefined}>
              <FieldLabel htmlFor={ids.dateOfBirth}>Date of Birth {required}</FieldLabel>
              <Input
                id={ids.dateOfBirth}
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
              <FieldError>{errors.dateOfBirth}</FieldError>
            </Field>
            <Field data-invalid={!!errors.password || undefined}>
              <FieldLabel htmlFor={ids.password}>Password {!existing && required}</FieldLabel>
              <Input
                id={ids.password}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FieldError>{errors.password}</FieldError>
            </Field>
            <Field data-invalid={!!errors.confirmPassword || undefined}>
              <FieldLabel htmlFor={ids.confirmPassword}>Confirm Password {!existing && required}</FieldLabel>
              <Input
                id={ids.confirmPassword}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <FieldError>{errors.confirmPassword}</FieldError>
            </Field>
            <div className="grid gap-3">
              <Field data-invalid={!!errors.email || undefined}>
                <FieldLabel htmlFor={ids.email}>Email {required}</FieldLabel>
                <Input id={ids.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <FieldError>{errors.email}</FieldError>
              </Field>
              {meSuper &&
                check("Is Email Confirmed", emailConfirmed, setEmailConfirmed, {
                  superOnly: true,
                })}
            </div>
            <div className="grid gap-3">
              <Field data-invalid={!!errors.mobile || undefined}>
                <FieldLabel htmlFor={ids.mobile}>Mobile</FieldLabel>
                <Input
                  id={ids.mobile}
                  inputMode="tel"
                  placeholder="01XXXXXXXXX"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
                <FieldError>{errors.mobile}</FieldError>
              </Field>
              {meSuper && check("Is Mobile Confirmed", mobileConfirmed, setMobileConfirmed, { superOnly: true })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access</CardTitle>
            <CardDescription>
              {self ? "You can't change your own role." : "What the user may do once signed in."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {meSuper && (
              <>
                {check("Is Superadmin", superAdmin, setSuperAdmin, {
                  superOnly: true,
                  disabled: self,
                  description: "Works with every institute and every page.",
                })}
                {check("Enable Two-Factor Authentication", twoFactorEnabled, setTwoFactorEnabled, {
                  superOnly: true,
                })}
              </>
            )}
            {!superAdmin && (
              <FilterField
                label="Role(s)"
                required
                value={role}
                onChange={(v) => setRole(v as UserRole)}
                placeholder="Select role"
                options={instituteRoles.map((r) => ({ value: r, label: r }))}
                error={errors.role}
                disabled={self}
              />
            )}
            {check("Force Password Change", forcePasswordChange, setForcePasswordChange, {
              description: "Asked to set a new password at next sign-in.",
            })}
            {check("Send Email Notification", sendEmail, setSendEmail, {
              description: "Emails the user that their account was created or updated.",
            })}
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background px-4 py-3 lg:-mx-6 lg:px-6">
        <Button asChild variant="outline">
          <Link href={LIST_HREF}>
            <ArrowLeftIcon data-icon="inline-start" />
            Back
          </Link>
        </Button>
        <Button type="submit">{existing ? "Update" : "Save"}</Button>
      </div>
    </form>
  )
}
