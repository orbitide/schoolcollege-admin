"use client"

import * as React from "react"
import Link from "next/link"
import {
  BuildingIcon,
  ChevronDownIcon,
  KeyRoundIcon,
  LogOutIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { isPlatformAdmin, useCurrentUser } from "@/lib/current-user"
import {
  removeAdminUser,
  requireAdminUserLogin,
  resetAdminUserPassword,
  setAdminUserRole,
  setAdminUserStatus,
  useAdminUsers,
  useOnlineUserIds,
  userRoles,
  userSessionStatus,
  type AdminUser,
  type UserRole,
  type UserSessionStatus,
} from "@/lib/global-settings"
import { cn } from "@/lib/utils"
import { useTeachers } from "@/lib/teachers"

// Legacy Users/Index (Manage Users): search, bulk operations and a role
// operation on the ticked users.

const bulkOperations = ["Block", "UnBlock", "Reset Password", "LogOut All", "Delete Users"] as const
type BulkOperation = (typeof bulkOperations)[number]

// One line per ticked user, like legacy BulkOperation's ApiResponse list.
type Outcome = { ok: boolean; message: string }

const statusClass: Record<UserSessionStatus, string> = {
  Online: "border-transparent bg-green-500/15 text-green-700 dark:text-green-400",
  Offline: "text-muted-foreground",
  Blocked: "border-transparent bg-destructive/10 text-destructive",
  "Require Login": "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
}

// Legacy Search: user name, full name, email, mobile, gender or role.
function matches(user: AdminUser, key: string) {
  if (!key) return true
  const k = key.toLowerCase()
  return [user.userName, user.name, user.email, user.mobile, user.gender, user.role].some((v) =>
    v.toLowerCase().includes(k)
  )
}

export function UserList() {
  const me = useCurrentUser()
  const users = useAdminUsers()
  const online = useOnlineUserIds()
  const teachers = useTeachers()
  const [draft, setDraft] = React.useState("")
  const [searchKey, setSearchKey] = React.useState("")
  const [picked, setPicked] = React.useState<ReadonlySet<number>>(new Set())
  const [operation, setOperation] = React.useState<BulkOperation | "">("")
  const [role, setRole] = React.useState<UserRole | "">("")
  const [confirm, setConfirm] = React.useState<BulkOperation | null>(null)
  const [newPasswords, setNewPasswords] = React.useState<{ userName: string; password: string }[]>([])
  const [results, setResults] = React.useState<Outcome[]>([])

  // Super admins first, then by user name (legacy OrderByDescending
  // IsSuperAdmin, ThenBy UserName).
  const rows = users
    .filter((u) => matches(u, searchKey))
    .sort(
      (a, b) =>
        Number(isPlatformAdmin(b)) - Number(isPlatformAdmin(a)) || a.userName.localeCompare(b.userName)
    )
  const chosen = rows.filter((u) => picked.has(u.id))
  const allPicked = rows.length > 0 && chosen.length === rows.length

  function pickAll(on: boolean) {
    setPicked(on ? new Set(rows.map((u) => u.id)) : new Set())
  }

  function pick(id: number, on: boolean) {
    setPicked((current) => {
      const next = new Set(current)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function search(event: React.FormEvent) {
    event.preventDefault()
    setSearchKey(draft.trim())
    setPicked(new Set())
  }

  function needsUsers() {
    if (chosen.length) return false
    toast.error("Select at least one user.")
    return true
  }

  // Every user's result stays on the page until dismissed (legacy
  // NccAlert.ShowMessages, ezducms's results panel).
  function report(outcomes: Outcome[]) {
    setResults(outcomes)
    const failed = outcomes.filter((o) => !o.ok).length
    if (failed) toast.error(`${failed} of ${outcomes.length} could not be completed.`)
    else toast.success("Operation successful.")
  }

  function applyBulk() {
    if (!operation) return toast.error("Please select an operation.")
    if (needsUsers()) return
    setConfirm(operation)
  }

  function runBulk(op: BulkOperation) {
    const passwords: typeof newPasswords = []
    const outcomes = chosen.map((user): Outcome => {
      const self = user.id === me.id
      switch (op) {
        case "Block":
          if (self) return { ok: false, message: "You can't block yourself." }
          setAdminUserStatus(user.id, "Blocked", me.name)
          return { ok: true, message: `Successfully blocked user ${user.userName}.` }
        case "UnBlock":
          setAdminUserStatus(user.id, "Active", me.name)
          return { ok: true, message: `Successfully unblocked user ${user.userName}.` }
        case "Reset Password":
          if (self) return { ok: false, message: "Set your own password with Update User." }
          passwords.push({ userName: user.userName, password: resetAdminUserPassword(user.id, me.name) })
          return { ok: true, message: `Password reset successful for user ${user.userName}.` }
        case "LogOut All":
          if (self) return { ok: false, message: "Use Log out to end your own session." }
          requireAdminUserLogin(user.id, me.name)
          return { ok: true, message: `Logout successful for user ${user.userName}.` }
        case "Delete Users": {
          if (self) return { ok: false, message: "You can't delete yourself." }
          const teacher = teachers.find((t) => t.userId === user.id && t.status !== "Deleted")
          if (teacher)
            return {
              ok: false,
              message: `${user.userName} signs in as teacher ${teacher.name}. Unlink the teacher first.`,
            }
          removeAdminUser(user.id)
          return { ok: true, message: `Successfully removed user ${user.userName}.` }
        }
      }
    })
    report(outcomes)
    if (passwords.length) setNewPasswords(passwords)
    setPicked(new Set())
  }

  // Legacy offers Add / Remove of several roles; a user here holds exactly
  // one role, so the operation sets it.
  function applyRole() {
    if (!role) return toast.error("Please select a role.")
    if (needsUsers()) return
    report(
      chosen.map((user): Outcome => {
        if (user.id === me.id) return { ok: false, message: "You can't change your own role." }
        setAdminUserRole(user.id, role, me.name)
        return { ok: true, message: `Role of ${user.userName} set to ${role}.` }
      })
    )
    setPicked(new Set())
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Manage Users</h2>
        <p className="text-sm text-muted-foreground">
          Everyone who signs in to the admin panel. Tick users to block, reset passwords, log out, delete or change
          their role.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={operation} onValueChange={(v) => setOperation(v as BulkOperation)}>
            <SelectTrigger className="w-56" aria-label="Bulk operation">
              <SelectValue placeholder="Select bulk operation" />
            </SelectTrigger>
            <SelectContent>
              {bulkOperations.map((op) => (
                <SelectItem key={op} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={applyBulk}>Apply</Button>
        </div>
        <form onSubmit={search} className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search users"
              placeholder="User name, name, email, mobile, role"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
          <Button asChild>
            <Link href="/users/new">
              <PlusIcon data-icon="inline-start" />
              New User
            </Link>
          </Button>
        </form>
      </div>

      {results.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
          <ul className="flex-1 space-y-1">
            {results.map((r, i) => (
              <li key={i} className={r.ok ? undefined : "text-destructive"}>
                {r.message}
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setResults([])}>
            <XIcon />
            <span className="sr-only">Dismiss results</span>
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Select all users"
                  checked={allPicked ? true : chosen.length > 0 ? "indeterminate" : false}
                  onCheckedChange={(checked) => pickAll(checked === true)}
                />
              </TableHead>
              <TableHead className="w-12">Sl</TableHead>
              <TableHead>User Name</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="w-20 text-center">Extra Allow</TableHead>
              <TableHead className="w-20 text-center">Extra Deny</TableHead>
              <TableHead className="w-28 text-center">Actions</TableHead>
              <TableHead className="w-32 text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((user, index) => {
                const status = userSessionStatus(user, online)
                return (
                  <TableRow key={user.id} data-state={picked.has(user.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        aria-label={`Select ${user.userName}`}
                        checked={picked.has(user.id)}
                        onCheckedChange={(checked) => pick(user.id, checked === true)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {user.userName}
                      {isPlatformAdmin(user) && (
                        <span className="font-bold" title="Super admin">
                          {" "}
                          (s)
                        </span>
                      )}
                      {user.twoFactorEnabled && (
                        <span className="font-bold" title="Two-factor authentication">
                          {" "}
                          (2F)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="tabular-nums">{user.mobile || "—"}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell className="text-center tabular-nums">{user.extraAllow.length}</TableCell>
                    <TableCell className="text-center tabular-nums">{user.extraDeny.length}</TableCell>
                    <TableCell className="text-center">
                      <UserActions
                        user={user}
                        status={status}
                        onForceLogout={() => {
                          requireAdminUserLogin(user.id, me.name)
                          report([{ ok: true, message: `Logout successful for user ${user.userName}.` }])
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn(statusClass[status])}>
                        {status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <p className="-mt-2 text-sm">
        Total <strong>{rows.length}</strong> {rows.length === 1 ? "User" : "Users"} Found.
        {chosen.length > 0 && <span className="text-muted-foreground"> {chosen.length} selected.</span>}
      </p>

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
          <SelectTrigger className="w-64" aria-label="Role for selected users">
            <SelectValue placeholder="Set role of selected users" />
          </SelectTrigger>
          <SelectContent>
            {userRoles.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={applyRole}>Apply</Button>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm} for {chosen.length} {chosen.length === 1 ? "user" : "users"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "Delete Users"
                ? "The users and their institute links are removed. Block them instead if you may need them again."
                : confirm === "Reset Password"
                  ? "Each user gets a new password and must sign in again with it."
                  : confirm === "LogOut All"
                    ? "Their sessions end and they must sign in again."
                    : confirm === "Block"
                      ? "They can no longer sign in. Their institute links and history stay."
                      : "They can sign in again with their existing access."}{" "}
              {chosen.map((u) => u.userName).join(", ")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirm === "UnBlock" ? "default" : "destructive"}
              onClick={() => confirm && runBulk(confirm)}
            >
              {confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={newPasswords.length > 0} onOpenChange={(open) => !open && setNewPasswords([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>New passwords</AlertDialogTitle>
            <AlertDialogDescription>
              Legacy emails these to the users. Until the API sends email, pass them on yourself.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-1 rounded-lg border p-3 font-mono text-sm">
            {newPasswords.map((p) => (
              <div key={p.userName} className="flex justify-between gap-4">
                <span>{p.userName}</span>
                <span className="select-all">{p.password}</span>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction>Done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Legacy row actions: Update User, Extra Permission, Data Permission and
// Force Logout. Legacy lists Force Logout only for online users; like ezducms
// it is on every row here, since a session on another device may not show as
// online. It's off for yourself (use Log out) and for users already signed
// out (Blocked / Require Login).
function UserActions({
  user,
  status,
  onForceLogout,
}: {
  user: AdminUser
  status: UserSessionStatus
  onForceLogout: () => void
}) {
  const me = useCurrentUser()
  const self = user.id === me.id
  const signedOut = status === "Blocked" || status === "Require Login"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Action
          <ChevronDownIcon data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link href={`/users/${user.id}/edit`}>
            <PencilIcon />
            Update User
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/users/${user.id}/extra-permission`}>
            <KeyRoundIcon />
            Extra Permission
          </Link>
        </DropdownMenuItem>
        {/* Legacy Data Permission limits which records a user reaches; here
            that is the institutes they may work with. */}
        <DropdownMenuItem asChild>
          <Link href={`/basic-settings/user-institutes/user-wise?user=${user.id}`}>
            <BuildingIcon />
            Data Permission
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={self || signedOut} onSelect={onForceLogout}>
          <LogOutIcon />
          Force Logout
          {(self || signedOut) && (
            <span className="ml-auto text-xs text-muted-foreground">{self ? "You" : "Signed out"}</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
