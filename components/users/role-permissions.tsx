"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react"
import { Collapsible } from "radix-ui"
import { toast } from "sonner"

import { permissionMenus } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useCurrentUser } from "@/lib/current-user"
import {
  SUPER_ADMIN_ROLE,
  roleAllows,
  saveRolePermissions,
  useUserRoles,
  type UserRoleRecord,
} from "@/lib/user-roles"

const LIST_HREF = "/users/roles"

// Legacy Users/RolePermission: the role's details, read-only, then the menu
// tree to tick what it grants. Here a menu or item ticks all its codes at
// once, shows how many are ticked, and changes are saved together rather
// than on every click.
export function RolePermissions({ roleId }: { roleId: number }) {
  const roles = useUserRoles()
  const role = roles.find((r) => r.id === roleId)
  if (!role) {
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
  return <Editor key={role.id} role={role} />
}

function Editor({ role }: { role: UserRoleRecord }) {
  const me = useCurrentUser()
  const menus = React.useMemo(() => permissionMenus(), [])
  const allCodes = React.useMemo(() => menus.flatMap((m) => m.items.flatMap((i) => i.codes.map((c) => c.code))), [menus])
  // A seeded role's patterns ("*.view") become the codes they cover.
  const grantedNow = React.useCallback(
    (r: UserRoleRecord) => new Set(allCodes.filter((code) => roleAllows(r, code))),
    [allCodes]
  )
  const [selected, setSelected] = React.useState(() => grantedNow(role))
  const [query, setQuery] = React.useState("")
  const [open, setOpen] = React.useState<ReadonlySet<string>>(() => new Set())
  const locked = role.name === SUPER_ADMIN_ROLE

  const saved = grantedNow(role)
  const dirty = selected.size !== saved.size || [...selected].some((code) => !saved.has(code))

  const q = query.trim().toLowerCase()
  const shown = menus.flatMap((menu) => {
    const items =
      q && !menu.title.toLowerCase().includes(q)
        ? menu.items.filter((item) => item.title.toLowerCase().includes(q))
        : menu.items
    return items.length ? [{ ...menu, items }] : []
  })

  function toggle(codes: string[], on: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      codes.forEach((code) => (on ? next.add(code) : next.delete(code)))
      return next
    })
  }

  function save() {
    saveRolePermissions(role.id, [...selected], me.name)
    toast.success(`Permissions of ${role.name} saved.`)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div>
        <Button asChild variant="link" className="h-auto px-0 text-muted-foreground">
          <Link href={LIST_HREF}>
            <ArrowLeftIcon data-icon="inline-start" />
            Manage User Roles
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">Role Permissions</h2>
        <p className="text-sm text-muted-foreground">Tick the menus users with this role may open.</p>
      </div>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Fact label="Name" value={role.name} />
          <Fact label="Group" value={role.group || "—"} />
          <Fact label="Description" value={role.description || "—"} wide />
          <Fact label="Rank" value={String(role.rank)} />
        </CardContent>
      </Card>

      {locked ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          The super admin role holds every permission; it can&apos;t be narrowed.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative w-full sm:w-72">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search menus"
                placeholder="Search menus"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground tabular-nums">
                {selected.size} of {allCodes.length} ticked
              </span>
              <Button variant="outline" size="sm" onClick={() => setOpen(new Set(menus.map((m) => m.title)))}>
                Expand
              </Button>
              <Button variant="outline" size="sm" onClick={() => setOpen(new Set())}>
                Collapse
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {shown.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">No menu matches.</p>
            )}
            {shown.map((menu) => {
              const codes = menu.items.flatMap((item) => item.codes.map((c) => c.code))
              const ticked = codes.filter((c) => selected.has(c)).length
              return (
                <Collapsible.Root
                  key={menu.title}
                  // A search opens every menu with a match.
                  open={!!q || open.has(menu.title)}
                  onOpenChange={(isOpen) =>
                    setOpen((current) => {
                      const next = new Set(current)
                      if (isOpen) next.add(menu.title)
                      else next.delete(menu.title)
                      return next
                    })
                  }
                  className="rounded-lg border"
                >
                  <div className="flex items-center gap-2 px-4 py-3">
                    <Checkbox
                      aria-label={`All of ${menu.title}`}
                      checked={tri(ticked, codes.length)}
                      onCheckedChange={(checked) => toggle(codes, checked === true)}
                    />
                    <Collapsible.Trigger asChild>
                      <button type="button" className="group flex flex-1 items-center gap-2 text-left font-medium">
                        <span className="flex-1">{menu.title}</span>
                        <span className="text-xs font-normal text-muted-foreground tabular-nums">
                          {ticked}/{codes.length}
                        </span>
                        <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                      </button>
                    </Collapsible.Trigger>
                  </div>
                  <Collapsible.Content className="divide-y border-t">
                    {menu.items.map((item) => {
                      const itemCodes = item.codes.map((c) => c.code)
                      const itemTicked = itemCodes.filter((c) => selected.has(c)).length
                      return (
                        <div key={item.title} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-2.5 pr-4 pl-10">
                          <label className="flex min-w-60 flex-1 items-center gap-2 text-sm">
                            <Checkbox
                              checked={tri(itemTicked, itemCodes.length)}
                              onCheckedChange={(checked) => toggle(itemCodes, checked === true)}
                            />
                            {item.title}
                          </label>
                          {/* A page with Admin / Manage / View surfaces grants each on its own. */}
                          {item.codes.length > 1 && (
                            <div className="flex flex-wrap gap-4">
                              {item.codes.map(({ code, label }) => (
                                <label key={code} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Checkbox
                                    checked={selected.has(code)}
                                    onCheckedChange={(checked) => toggle([code], checked === true)}
                                  />
                                  {label}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </Collapsible.Content>
                </Collapsible.Root>
              )
            })}
          </div>

          <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t bg-background px-4 py-3 lg:-mx-6 lg:px-6">
            {dirty && <span className="mr-auto text-sm text-muted-foreground">Unsaved changes</span>}
            <Button variant="outline" disabled={!dirty} onClick={() => setSelected(grantedNow(role))}>
              Reset
            </Button>
            <Button disabled={!dirty} onClick={save}>
              Save
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function tri(ticked: number, total: number) {
  return total > 0 && ticked === total ? true : ticked > 0 ? ("indeterminate" as const) : false
}

function Fact({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "grid gap-1 sm:col-span-2" : "grid gap-1"}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
