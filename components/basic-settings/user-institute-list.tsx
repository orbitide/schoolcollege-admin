"use client"

import * as React from "react"
import Link from "next/link"
import {
  CircleCheckIcon,
  CircleMinusIcon,
  EllipsisVerticalIcon,
  LinkIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { StatusBadge } from "@/components/institutes/status-badge"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  adminUsers,
  assignUserInstitute,
  removeUserInstitute,
  setUserInstituteStatus,
  useUserInstitutes,
  type UserInstitute,
} from "@/lib/global-settings"
import { useInstitutes } from "@/lib/institutes-store"

const ALL = "all"

// Legacy "User Institute": which institutes each admin user can work with.
export function UserInstituteList() {
  const links = useUserInstitutes()
  const institutes = useInstitutes()
  const [userFilter, setUserFilter] = React.useState(ALL)
  const [assigning, setAssigning] = React.useState(false)
  const [removing, setRemoving] = React.useState<UserInstitute | null>(null)

  const userOf = (id: number) => adminUsers.find((user) => user.id === id)
  const instituteOf = (id: number) => institutes.find((institute) => institute.id === id)
  const rows = links.filter(
    (link) =>
      (userFilter === ALL || String(link.userId) === userFilter) &&
      instituteOf(link.instituteId)
  )

  function toggleStatus(link: UserInstitute) {
    const next = link.status === "Active" ? "Inactive" : "Active"
    setUserInstituteStatus(link.id, next)
    toast.success(next === "Active" ? "Access activated" : "Access inactivated")
  }

  function remove() {
    if (!removing) return
    removeUserInstitute(removing.id)
    toast.success("Access removed")
    setRemoving(null)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Manage User Institutes (Admin)
          </h2>
          <p className="text-sm text-muted-foreground">
            Which institutes each admin user can work with.
          </p>
        </div>
        <Button onClick={() => setAssigning(true)}>
          <LinkIcon data-icon="inline-start" />
          Assign institute
        </Button>
      </div>

      <Select value={userFilter} onValueChange={setUserFilter}>
        <SelectTrigger aria-label="User" className="w-full sm:w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={ALL}>All users</SelectItem>
            {adminUsers.map((user) => (
              <SelectItem key={user.id} value={String(user.id)}>
                {user.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12">Sl</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Institute</TableHead>
              <TableHead>EIIN</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((link, index) => {
                const user = userOf(link.userId)
                const institute = instituteOf(link.instituteId)!
                return (
                  <TableRow key={link.id}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{user?.name ?? "Unknown user"}</span>
                        <span className="text-xs text-muted-foreground">{user?.email}</span>
                      </div>
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
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onSelect={() => toggleStatus(link)}>
                            {link.status === "Active" ? (
                              <CircleMinusIcon />
                            ) : (
                              <CircleCheckIcon />
                            )}
                            {link.status === "Active" ? "Inactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setRemoving(link)}
                          >
                            <Trash2Icon />
                            Remove access
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No institutes assigned yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={assigning} onOpenChange={setAssigning}>
        <DialogContent>
          {assigning && (
            <AssignForm
              initialUser={userFilter === ALL ? "" : userFilter}
              onDone={() => setAssigning(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove access?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing &&
                `${userOf(removing.userId)?.name ?? "This user"} will no longer be able to work with ${
                  instituteOf(removing.instituteId)?.name ?? "this institute"
                }.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AssignForm({ initialUser, onDone }: { initialUser: string; onDone: () => void }) {
  const institutes = useInstitutes()
  const [userId, setUserId] = React.useState(initialUser)
  const [instituteId, setInstituteId] = React.useState("")
  const [errors, setErrors] = React.useState<{ user?: string; institute?: string }>({})

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = {
      user: userId ? undefined : "Pick a user.",
      institute: instituteId ? undefined : "Pick an institute.",
    }
    if (!next.user && !next.institute && !assignUserInstitute(Number(userId), Number(instituteId))) {
      next.institute = "This user already has this institute."
    }
    setErrors(next)
    if (next.user || next.institute) return
    toast.success("Institute assigned")
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Assign institute</DialogTitle>
        <DialogDescription>Give a user access to an institute.</DialogDescription>
      </DialogHeader>
      <Field data-invalid={!!errors.user}>
        <FieldLabel htmlFor="assign-user">User</FieldLabel>
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger id="assign-user" className="w-full" aria-invalid={!!errors.user}>
            <SelectValue placeholder="Select user" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {adminUsers.map((user) => (
                <SelectItem key={user.id} value={String(user.id)}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldError>{errors.user}</FieldError>
      </Field>
      <Field data-invalid={!!errors.institute}>
        <FieldLabel htmlFor="assign-institute">Institute</FieldLabel>
        <Select value={instituteId} onValueChange={setInstituteId}>
          <SelectTrigger
            id="assign-institute"
            className="w-full"
            aria-invalid={!!errors.institute}
          >
            <SelectValue placeholder="Select institute" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {institutes.map((institute) => (
                <SelectItem key={institute.id} value={String(institute.id)}>
                  {institute.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldError>{errors.institute}</FieldError>
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">Assign</Button>
      </DialogFooter>
    </form>
  )
}
