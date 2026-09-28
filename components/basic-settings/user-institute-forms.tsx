"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { FieldError } from "@/components/ui/field"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import {
  adminUsers,
  saveInstituteUsers,
  saveUserInstitutes,
  useUserInstitutes,
} from "@/lib/global-settings"

const LIST_HREF = "/basic-settings/user-institutes"

// Legacy UserInstitute/CreateEdit ("Add User Wise Institute"): pick a user,
// tick the institutes they may work with. Picking a user ticks what they
// already have, and saving replaces that set.
export function UserWiseInstituteForm({ initialUserId }: { initialUserId?: number }) {
  const router = useRouter()
  const currentUser = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const links = useUserInstitutes()
  // ?user= (the list's "Edit user's institutes") opens with that user picked.
  const [userId, setUserId] = React.useState(() =>
    adminUsers.some((u) => u.id === initialUserId) ? String(initialUserId) : ""
  )
  const [ticked, setTicked] = React.useState(() => ticksOf(userId))
  const [errors, setErrors] = React.useState<{ user?: string; items?: string }>({})

  // What the user already has, as legacy InstitutePartial pre-ticks.
  function ticksOf(value: string) {
    return new Set(links.filter((l) => String(l.userId) === value).map((l) => l.instituteId))
  }

  function pickUser(value: string) {
    setUserId(value)
    setErrors({})
    setTicked(ticksOf(value))
  }

  function save(andNew: boolean) {
    const selected = institutes.filter((i) => ticked.has(i.id)).map((i) => i.id)
    const next = {
      user: userId ? undefined : "Select a user.",
      items: !userId || selected.length ? undefined : "No institute selected.",
    }
    setErrors(next)
    if (next.user || next.items) return
    saveUserInstitutes(
      Number(userId),
      selected,
      institutes.map((i) => i.id),
      currentUser.name
    )
    toast.success("Data saved successfully")
    if (andNew) {
      setUserId("")
      setTicked(new Set())
    } else {
      router.push(LIST_HREF)
    }
  }

  return (
    <AssignmentForm
      title="Add User Wise Institute"
      description="Pick a user, then tick the institutes they can work with. Saving replaces the user's institutes."
      selectLabel="User"
      selectPlaceholder="Select a user"
      selectValue={userId}
      onSelect={pickUser}
      selectOptions={adminUsers.map((u) => ({ value: String(u.id), label: u.name }))}
      selectError={errors.user}
      itemsLabel="Select Institute"
      allLabel="All Institute"
      emptyText="You have no institute to assign."
      items={institutes.map((i) => ({ id: i.id, label: i.name, hint: i.eiin }))}
      ticked={ticked}
      onTickedChange={setTicked}
      itemsError={errors.items}
      onSave={save}
    />
  )
}

// Legacy InstituteUser/CreateEdit ("Add Institute Wise User"): pick an
// institute, tick its users. Saving replaces the institute's users.
export function InstituteWiseUserForm({ initialInstituteId }: { initialInstituteId?: number }) {
  const router = useRouter()
  const currentUser = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const links = useUserInstitutes()
  // ?institute= opens with that institute picked.
  const [instituteId, setInstituteId] = React.useState(() =>
    institutes.some((i) => i.id === initialInstituteId) ? String(initialInstituteId) : ""
  )
  const [ticked, setTicked] = React.useState(() => ticksOf(instituteId))
  const [errors, setErrors] = React.useState<{ institute?: string; items?: string }>({})

  // The institute's current users, as legacy UserPartial pre-ticks.
  function ticksOf(value: string) {
    return new Set(links.filter((l) => String(l.instituteId) === value).map((l) => l.userId))
  }

  function pickInstitute(value: string) {
    setInstituteId(value)
    setErrors({})
    setTicked(ticksOf(value))
  }

  function save(andNew: boolean) {
    const selected = adminUsers.filter((u) => ticked.has(u.id)).map((u) => u.id)
    const next = {
      institute: instituteId ? undefined : "Select an institute.",
      items: !instituteId || selected.length ? undefined : "No user selected.",
    }
    setErrors(next)
    if (next.institute || next.items) return
    saveInstituteUsers(Number(instituteId), selected, currentUser.name)
    toast.success("Data saved successfully")
    if (andNew) {
      setInstituteId("")
      setTicked(new Set())
    } else {
      router.push(LIST_HREF)
    }
  }

  return (
    <AssignmentForm
      title="Add Institute Wise User"
      description="Pick an institute, then tick the users who can work with it. Saving replaces the institute's users."
      selectLabel="Institute"
      selectPlaceholder="Select an institute"
      selectValue={instituteId}
      onSelect={pickInstitute}
      selectOptions={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
      selectError={errors.institute}
      itemsLabel="Select User"
      allLabel="All User"
      emptyText="There is no user to assign."
      items={adminUsers.map((u) => ({ id: u.id, label: u.name, hint: u.email }))}
      ticked={ticked}
      onTickedChange={setTicked}
      itemsError={errors.items}
      onSave={save}
    />
  )
}

// One select, then a checkbox grid with an "All …" box once something is
// picked (the legacy _InstitutePartial / _UserPartial).
function AssignmentForm({
  title,
  description,
  selectLabel,
  selectPlaceholder,
  selectValue,
  onSelect,
  selectOptions,
  selectError,
  itemsLabel,
  allLabel,
  emptyText,
  items,
  ticked,
  onTickedChange,
  itemsError,
  onSave,
}: {
  title: string
  description: string
  selectLabel: string
  selectPlaceholder: string
  selectValue: string
  onSelect: (value: string) => void
  selectOptions: { value: string; label: string }[]
  selectError?: string
  itemsLabel: string
  allLabel: string
  emptyText: string
  items: { id: number; label: string; hint: string }[]
  ticked: Set<number>
  onTickedChange: (next: Set<number>) => void
  itemsError?: string
  onSave: (andNew: boolean) => void
}) {
  const tickedCount = items.filter((item) => ticked.has(item.id)).length
  const allTicked = items.length > 0 && tickedCount === items.length

  function toggle(id: number, on: boolean) {
    const next = new Set(ticked)
    if (on) next.add(id)
    else next.delete(id)
    onTickedChange(next)
  }

  function toggleAll(on: boolean) {
    const next = new Set(ticked)
    for (const item of items) {
      if (on) next.add(item.id)
      else next.delete(item.id)
    }
    onTickedChange(next)
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6"
      onSubmit={(event) => {
        event.preventDefault()
        onSave(false)
      }}
    >
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={LIST_HREF}>Manage user institute</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FilterField
            label={selectLabel}
            required
            value={selectValue}
            onChange={onSelect}
            options={selectOptions}
            placeholder={selectPlaceholder}
            error={selectError}
          />
        </CardContent>
      </Card>

      {selectValue && (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2 border-b">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-base">
                {itemsLabel}
                <span className="text-destructive" aria-hidden>
                  {" "}
                  *
                </span>
              </CardTitle>
              <CardDescription>
                {tickedCount} of {items.length} selected
              </CardDescription>
            </div>
            {items.length > 0 && (
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={allTicked ? true : tickedCount > 0 ? "indeterminate" : false}
                  onCheckedChange={(checked) => toggleAll(checked === true)}
                />
                {allLabel}
              </label>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {items.length ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 hover:bg-muted/50 has-data-checked:border-primary/50 has-data-checked:bg-primary/5"
                  >
                    <Checkbox
                      checked={ticked.has(item.id)}
                      onCheckedChange={(checked) => toggle(item.id, checked === true)}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{item.label}</span>
                      <span className="truncate text-xs text-muted-foreground">{item.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{emptyText}</p>
            )}
            <FieldError>{itemsError}</FieldError>
          </CardContent>
          <CardFooter className="justify-end gap-2 border-t">
            <Button asChild type="button" variant="outline">
              <Link href={LIST_HREF}>Back</Link>
            </Button>
            <Button type="button" variant="secondary" onClick={() => onSave(true)}>
              Save and new
            </Button>
            <Button type="submit">Save</Button>
          </CardFooter>
        </Card>
      )}
    </form>
  )
}
