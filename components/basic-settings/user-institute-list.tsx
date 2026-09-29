"use client"

import * as React from "react"
import Link from "next/link"
import {
  BuildingIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"

import { StatusBadge } from "@/components/institutes/status-badge"
import { FilterField, stamp } from "@/components/term-exams/term-exam-fields"
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
import { useCurrentUser } from "@/lib/current-user"
import {
  useAdminUsers,
  removeUserInstitute,
  toggleUserInstituteStatus,
  useUserInstitutes,
  type UserInstitute,
} from "@/lib/global-settings"
import { useInstitutes } from "@/lib/institutes-store"

const BASE = "/basic-settings/user-institutes"

// Legacy UserInstitute/ManageAdmin: which institutes each admin user can
// work with, one row per user–institute link.
export function UserInstituteList() {
  const currentUser = useCurrentUser()
  const links = useUserInstitutes()
  const adminUsers = useAdminUsers()
  const institutes = useInstitutes()
  const [userFilter, setUserFilter] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [removing, setRemoving] = React.useState<UserInstitute | null>(null)

  const userOf = (id: number) => adminUsers.find((user) => user.id === id)
  const instituteOf = (id: number) => institutes.find((institute) => institute.id === id)

  // Legacy searches user email and institute name, ordered by institute name.
  const needle = query.trim().toLowerCase()
  const rows = links
    .flatMap((link) => {
      const institute = instituteOf(link.instituteId)
      if (!institute) return []
      if (userFilter && String(link.userId) !== userFilter) return []
      const user = userOf(link.userId)
      if (
        needle &&
        ![user?.name, user?.email, institute.name].some((text) =>
          text?.toLowerCase().includes(needle)
        )
      ) {
        return []
      }
      return [{ link, user, institute }]
    })
    .sort((a, b) => a.institute.name.localeCompare(b.institute.name))

  function toggleStatus(link: UserInstitute) {
    toggleUserInstituteStatus(link.id, currentUser.name)
    toast.success(link.status === "Active" ? "In-activated successfully" : "Activated successfully")
  }

  function remove() {
    if (!removing) return
    removeUserInstitute(removing.id)
    toast.success("User institute deleted successfully")
    setRemoving(null)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">User Institute Manage</h2>
          <p className="text-sm text-muted-foreground">
            Which institutes each admin user can work with.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`${BASE}/institute-wise`}>
              <UsersIcon data-icon="inline-start" />
              Add Institute Wise User
            </Link>
          </Button>
          <Button asChild>
            <Link href={`${BASE}/user-wise`}>
              <BuildingIcon data-icon="inline-start" />
              Add User Wise Institute
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Legacy hides the user filter when there is only one user. */}
          {adminUsers.length > 1 && (
            <FilterField
              label="User"
              value={userFilter}
              onChange={setUserFilter}
              options={adminUsers.map((user) => ({ value: String(user.id), label: user.name }))}
              allLabel="All User"
            />
          )}
          <div className="flex flex-col justify-end">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search user email, institute"
                aria-label="Search user institutes"
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
              <TableHead>User Name</TableHead>
              <TableHead>Institute Name</TableHead>
              <TableHead>EIIN</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map(({ link, user, institute }, index) => {
                const edited = link.createdAt !== link.modifiedAt
                return (
                  <TableRow key={link.id}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Link
                        href={`${BASE}/${link.id}`}
                        className="flex flex-col underline-offset-4 hover:underline"
                      >
                        <span className="font-medium">{user?.name ?? "Unknown user"}</span>
                        <span className="text-xs text-muted-foreground">{user?.email}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/institutes/${institute.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {institute.name}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums">{institute.eiin}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {edited ? (
                        <>
                          <div>Cr: {link.createdBy}</div>
                          <div>Mo: {link.modifiedBy}</div>
                        </>
                      ) : (
                        link.createdBy
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      {edited ? (
                        <>
                          <div>Cr: {stamp(link.createdAt)}</div>
                          <div>Mo: {stamp(link.modifiedAt)}</div>
                        </>
                      ) : (
                        stamp(link.createdAt)
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={link.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground data-[state=open]:bg-muted"
                          >
                            <EllipsisVerticalIcon />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={`${BASE}/${link.id}`}>
                              <EyeIcon />
                              Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`${BASE}/user-wise?user=${link.userId}`}>
                              <PencilIcon />
                              Edit user&apos;s institutes
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toggleStatus(link)}>
                            {link.status === "Active" ? <CircleMinusIcon /> : <CircleCheckIcon />}
                            {link.status === "Active" ? "Inactive" : "Active"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setRemoving(link)}
                          >
                            <Trash2Icon />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No user institute found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user institute?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing &&
                `${userOf(removing.userId)?.name ?? "This user"} will no longer be able to work with ${
                  instituteOf(removing.instituteId)?.name ?? "this institute"
                }. This can't be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
