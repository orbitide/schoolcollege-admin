"use client"

import * as React from "react"
import Link from "next/link"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { permissionMenus, type PermissionMenu } from "@/components/app-sidebar"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCurrentUser } from "@/lib/current-user"
import { useAdminUsers } from "@/lib/global-settings"
import { deleteUserRole, roleAllows, useUserRoles, type UserRoleRecord } from "@/lib/user-roles"

// Legacy "Contains Module(n), Menu(n)": the sidebar menus, and the items in
// them, the role grants anything in.
export function roleContains(role: UserRoleRecord, menus: PermissionMenu[]) {
  let modules = 0
  let items = 0
  for (const menu of menus) {
    const granted = menu.items.filter((item) => item.codes.some((c) => roleAllows(role, c.code))).length
    if (granted) modules++
    items += granted
  }
  return { modules, items }
}

// Legacy Users/ManageUserRoles: every role with what it contains and how
// many users hold it; Edit, Permissions and Delete per role.
export function RoleList() {
  const roles = useUserRoles()
  const users = useAdminUsers()
  const menus = React.useMemo(() => permissionMenus(), [])
  const [deleting, setDeleting] = React.useState<UserRoleRecord | null>(null)

  // Legacy orders by name.
  const rows = [...roles].sort((a, b) => a.name.localeCompare(b.name))
  const usersOf = (role: UserRoleRecord) => users.filter((u) => u.role === role.name).length

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Manage User Roles</h2>
          <p className="text-sm text-muted-foreground">
            A role bundles the menus its users may open. Built-in roles can&apos;t be renamed or deleted.
          </p>
        </div>
        <Button asChild>
          <Link href="/users/roles/new">
            <PlusIcon data-icon="inline-start" />
            Create New
          </Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12">SN</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Contains</TableHead>
              <TableHead>Users</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((role, index) => {
              const contains = roleContains(role, menus)
              const count = usersOf(role)
              return (
                <TableRow key={role.id}>
                  <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {role.name}
                    {role.builtIn && (
                      <Badge variant="secondary" className="ml-2">
                        Built-in
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{role.group || "—"}</TableCell>
                  <TableCell className="max-w-80 whitespace-normal text-muted-foreground">
                    {role.description || "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    Module({contains.modules}), Menu({contains.items})
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/users?searchKey=${encodeURIComponent(role.name)}`}
                      className="tabular-nums underline-offset-4 hover:underline"
                    >
                      User({count})
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="link" size="sm" className="h-auto px-1.5">
                        <Link href={`/users/roles/${role.id}/edit`}>Edit</Link>
                      </Button>
                      <span className="text-muted-foreground">|</span>
                      <Button asChild variant="link" size="sm" className="h-auto px-1.5">
                        <Link href={`/users/roles/${role.id}/permissions`}>Permissions</Link>
                      </Button>
                      <span className="text-muted-foreground">|</span>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto px-1.5 text-destructive"
                        disabled={role.builtIn}
                        title={role.builtIn ? "Built-in roles can't be deleted" : undefined}
                        onClick={() => setDeleting(role)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {deleting && (
        <DeleteRoleDialog
          key={deleting.id}
          role={deleting}
          userCount={usersOf(deleting)}
          others={rows.filter((r) => r.id !== deleting.id).map((r) => r.name)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

// Legacy DeleteRoleConfirm: the role and its assigned users. Every user
// here needs a role, so its users move to one picked here.
function DeleteRoleDialog({
  role,
  userCount,
  others,
  onClose,
}: {
  role: UserRoleRecord
  userCount: number
  others: string[]
  onClose: () => void
}) {
  const me = useCurrentUser()
  const [moveTo, setMoveTo] = React.useState("")
  const [error, setError] = React.useState<string>()

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete role {role.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Assigned users: {userCount}.{" "}
            {userCount > 0 ? "Pick the role they move to." : "No user holds this role."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {userCount > 0 && (
          <FilterField
            label="Move users to"
            required
            value={moveTo}
            onChange={(v) => {
              setMoveTo(v)
              setError(undefined)
            }}
            placeholder="Select role"
            options={others.map((r) => ({ value: r, label: r }))}
            error={error}
          />
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Back</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(event) => {
              if (userCount > 0 && !moveTo) {
                event.preventDefault()
                setError("Select the role its users move to.")
                return
              }
              deleteUserRole(role.id, moveTo, me.name)
              toast.success(`Role ${role.name} delete successful.`)
              onClose()
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
