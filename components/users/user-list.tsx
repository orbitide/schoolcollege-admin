"use client"

import * as React from "react"
import Link from "next/link"
import {
  BanIcon,
  CircleCheckIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { FilterField } from "@/components/term-exams/term-exam-fields"
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
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
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
  setAdminUserStatus,
  useAdminUsers,
  useUserInstitutes,
  userRoles,
  userStatuses,
  type AdminUser,
} from "@/lib/global-settings"
import { useInstitutes } from "@/lib/institutes-store"
import { useTeachers } from "@/lib/teachers"

// Every admin-panel user, of every role, with the institutes they may work
// with (User Institutes).
export function UserList() {
  const users = useAdminUsers()
  const links = useUserInstitutes()
  const institutes = useInstitutes()
  const [role, setRole] = React.useState("")
  const [status, setStatus] = React.useState("")
  const [search, setSearch] = React.useState("")

  const institutesOf = (user: AdminUser) =>
    links
      .filter((l) => l.userId === user.id && l.status === "Active")
      .map((l) => institutes.find((i) => i.id === l.instituteId)?.name)
      .filter((name): name is string => !!name)

  const query = search.trim().toLowerCase()
  const rows = users.filter(
    (u) =>
      (!role || u.role === role) &&
      (!status || u.status === status) &&
      (!query || [u.name, u.email, u.mobile].some((v) => v.toLowerCase().includes(query)))
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Users</h2>
          <p className="text-sm text-muted-foreground">
            Everyone who signs in to the admin panel: platform staff, institute users and teachers.
          </p>
        </div>
        <Button asChild>
          <Link href="/users/new">
            <PlusIcon data-icon="inline-start" />
            Add User
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FilterField
            label="Role"
            value={role}
            onChange={setRole}
            allLabel="All roles"
            options={userRoles.map((r) => ({ value: r, label: r }))}
          />
          <FilterField
            label="Status"
            value={status}
            onChange={setStatus}
            allLabel="All statuses"
            options={userStatuses.map((s) => ({ value: s, label: s }))}
          />
          <div className="grid gap-2">
            <span className="text-sm font-medium">Search</span>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Name, email or mobile"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12">Sl</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Institutes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No users match your filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((user, index) => {
                const names = institutesOf(user)
                return (
                  <TableRow key={user.id}>
                    <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell className="tabular-nums">{user.mobile || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={isPlatformAdmin(user) ? "secondary" : "outline"}>{user.role}</Badge>
                    </TableCell>
                    <TableCell className="max-w-72">
                      {isPlatformAdmin(user) ? (
                        <span className="text-muted-foreground">All institutes</span>
                      ) : names.length ? (
                        <span className="line-clamp-2">{names.join(", ")}</span>
                      ) : (
                        <span className="text-muted-foreground">None linked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="px-1.5 text-muted-foreground">
                        {user.status === "Active" ? (
                          <CircleCheckIcon className="fill-green-500 text-background dark:fill-green-400" />
                        ) : (
                          <BanIcon className="text-destructive" />
                        )}
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <UserActions user={user} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

type Confirm = "block" | "unblock" | "delete"

function UserActions({ user }: { user: AdminUser }) {
  const me = useCurrentUser()
  const teachers = useTeachers()
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)
  const self = user.id === me.id
  const teacher = teachers.find((t) => t.userId === user.id && t.status !== "Deleted")

  const dialogs: Record<Confirm, { title: string; description: string; action: string; destructive?: boolean; run: () => void; done: string }> = {
    block: {
      title: `Block ${user.name}?`,
      description: "They can no longer sign in. Their institute links and history stay, and you can unblock them later.",
      action: "Block",
      destructive: true,
      run: () => setAdminUserStatus(user.id, "Blocked", me.name),
      done: `${user.name} blocked`,
    },
    unblock: {
      title: `Unblock ${user.name}?`,
      description: "They can sign in again with their existing access.",
      action: "Unblock",
      run: () => setAdminUserStatus(user.id, "Active", me.name),
      done: `${user.name} unblocked`,
    },
    delete: {
      title: `Delete ${user.name}?`,
      description: "The user and their institute links are removed. Consider blocking instead if you may need them again.",
      action: "Delete",
      destructive: true,
      run: () => removeAdminUser(user.id),
      done: `${user.name} deleted`,
    },
  }
  const current = confirm ? dialogs[confirm] : null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
            <EllipsisVerticalIcon />
            <span className="sr-only">Actions for {user.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/users/${user.id}/edit`}>
              <PencilIcon />
              Edit
            </Link>
          </DropdownMenuItem>
          {!self && (
            <>
              {user.status === "Active" ? (
                <DropdownMenuItem onSelect={() => setConfirm("block")}>
                  <BanIcon />
                  Block
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setConfirm("unblock")}>
                  <CircleCheckIcon />
                  Unblock
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  if (teacher) toast.error(`${user.name} signs in as teacher ${teacher.name}. Unlink the teacher first.`)
                  else setConfirm("delete")
                }}
              >
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={!!current} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{current?.title}</AlertDialogTitle>
            <AlertDialogDescription>{current?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={current?.destructive ? "destructive" : "default"}
              onClick={() => {
                if (!current) return
                current.run()
                toast.success(current.done)
              }}
            >
              {current?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
