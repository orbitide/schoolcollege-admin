"use client"

import * as React from "react"
import { toast } from "sonner"

import { IMAGE_TYPES, ImageField } from "@/components/institutes/institute-form"
import { TextField } from "@/components/settings/settings-fields"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { changeOwnPassword, useCurrentUser } from "@/lib/current-user"
import {
  disableOwnTwoFactor,
  profileErrors,
  updateOwnProfile,
  userGenders,
  type AdminUser,
  type ProfileInput,
  type UserGender,
} from "@/lib/global-settings"

// Legacy Manage/IndexBackend ("User Profile") and ChangePasswordBackend: the
// signed-in user's own details, password and two-factor sign-in. External
// logins aren't ported (legacy: "No active external login provider found").
export function AccountPage() {
  const user = useCurrentUser()

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Account</h2>
        <p className="text-sm text-muted-foreground">Your profile and sign-in details.</p>
      </div>
      <div className="grid items-start gap-4 md:gap-6 @4xl/main:grid-cols-2">
        <ProfileForm key={`${user.id}-${user.modifiedAt}`} user={user} />
        <div className="grid gap-4 md:gap-6">
          <PasswordForm key={user.id} />
          <TwoFactorCard user={user} />
        </div>
      </div>
    </div>
  )
}

const confirmedBadge = (value: string, confirmed: boolean) =>
  value ? (
    <Badge variant={confirmed ? "secondary" : "outline"}>{confirmed ? "Confirmed" : "Not confirmed"}</Badge>
  ) : null

function ProfileForm({ user }: { user: AdminUser }) {
  const saved = React.useMemo<ProfileInput>(
    () => ({
      name: user.name,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      email: user.email,
      mobile: user.mobile,
      profilePicture: user.profilePicture,
    }),
    [user]
  )
  const [draft, setDraft] = React.useState(saved)
  const [errors, setErrors] = React.useState<ReturnType<typeof profileErrors>>({})
  const changed = JSON.stringify(draft) !== JSON.stringify(saved)
  const set = <K extends keyof ProfileInput>(key: K) => (value: ProfileInput[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  function pickPicture(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) {
      setErrors((e) => ({ ...e, profilePicture: "Only .jpg, .jpeg and .png images are accepted." }))
      return
    }
    // Legacy _MAX_ALLOWED_PROFILE_PIC_SIZE.
    if (file.size > 1024 * 1024) {
      setErrors((e) => ({ ...e, profilePicture: "Invalid/large picture. Pick one under 1 MB." }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      set("profilePicture")(String(reader.result))
      setErrors((e) => ({ ...e, profilePicture: undefined }))
    }
    reader.readAsDataURL(file)
  }

  function save(event: React.FormEvent) {
    event.preventDefault()
    const found = profileErrors(draft, user.id)
    setErrors(found)
    if (Object.values(found).some(Boolean)) {
      toast.error("Check the highlighted fields.")
      return
    }
    updateOwnProfile(user.id, draft, user.name)
    toast.success("Your profile has been updated.")
  }

  return (
    <form onSubmit={save}>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            User Profile <Badge variant="secondary">{user.role}</Badge>
          </CardTitle>
          <CardDescription>Changing your email or mobile marks it not confirmed.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ImageField
              name="profilePicture"
              label="Profile Picture"
              value={draft.profilePicture}
              error={errors.profilePicture}
              onChange={pickPicture}
              onClear={() => set("profilePicture")("")}
            />
          </div>
          <TextField label="User Name" value={user.userName} onChange={() => {}} disabled />
          <TextField label="Full Name" required value={draft.name} onChange={set("name")} error={errors.name} />
          <FilterField
            label="Gender"
            value={draft.gender}
            onChange={(v) => set("gender")(v as UserGender)}
            options={userGenders.map((g) => ({ value: g, label: g }))}
          />
          <TextField
            label="Date of Birth"
            required
            type="date"
            value={draft.dateOfBirth}
            onChange={set("dateOfBirth")}
            error={errors.dateOfBirth}
          />
          <div className="flex flex-col gap-1.5">
            <TextField
              label="Email"
              required
              type="email"
              value={draft.email}
              onChange={set("email")}
              error={errors.email}
            />
            <div>{draft.email === user.email && confirmedBadge(user.email, user.emailConfirmed)}</div>
          </div>
          <div className="flex flex-col gap-1.5">
            <TextField
              label="Phone Number"
              inputMode="tel"
              placeholder="01XXXXXXXXX"
              value={draft.mobile}
              onChange={set("mobile")}
              error={errors.mobile}
            />
            <div>{draft.mobile === user.mobile && confirmedBadge(user.mobile, user.mobileConfirmed)}</div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t">
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
            Update Profile
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

const blankPasswords = { oldPassword: "", newPassword: "", confirmPassword: "" }

function PasswordForm() {
  const user = useCurrentUser()
  const [draft, setDraft] = React.useState(blankPasswords)
  const [errors, setErrors] = React.useState<ReturnType<typeof changeOwnPassword>>({})
  const set = (key: keyof typeof draft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }))

  function save(event: React.FormEvent) {
    event.preventDefault()
    const found = changeOwnPassword(draft)
    setErrors(found)
    if (Object.keys(found).length) return
    setDraft(blankPasswords)
    toast.success("Your password has been changed.")
  }

  return (
    <form onSubmit={save}>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Change Password
            {user.forcePasswordChange && <Badge variant="destructive">Change required</Badge>}
          </CardTitle>
          <CardDescription>At least 6 characters, with a digit.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <TextField
            label="Current Password"
            type="password"
            autoComplete="current-password"
            value={draft.oldPassword}
            onChange={set("oldPassword")}
            error={errors.oldPassword}
          />
          <TextField
            label="New Password"
            type="password"
            autoComplete="new-password"
            value={draft.newPassword}
            onChange={set("newPassword")}
            error={errors.newPassword}
          />
          <TextField
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
            value={draft.confirmPassword}
            onChange={set("confirmPassword")}
            error={errors.confirmPassword}
          />
        </CardContent>
        <CardFooter className="flex justify-end border-t">
          <Button type="submit" disabled={!draft.oldPassword && !draft.newPassword && !draft.confirmPassword}>
            Update Password
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

function TwoFactorCard({ user }: { user: AdminUser }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Two Factor Authentication
          <Badge variant={user.twoFactorEnabled ? "secondary" : "outline"}>
            {user.twoFactorEnabled ? "On" : "Off"}
          </Badge>
        </CardTitle>
        <CardDescription>
          {user.twoFactorEnabled
            ? "You confirm each sign-in with a code from your authenticator app."
            : "Setting up an authenticator app becomes available once the backend exists."}
        </CardDescription>
      </CardHeader>
      {user.twoFactorEnabled && (
        <CardFooter className="flex justify-end border-t">
          <Button
            variant="destructive"
            onClick={() => {
              disableOwnTwoFactor(user.id, user.name)
              toast.success("Two factor authentication is off.")
            }}
          >
            Disable
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
