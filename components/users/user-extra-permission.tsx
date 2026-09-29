"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, CheckIcon, ChevronRightIcon, SearchIcon, XIcon } from "lucide-react"
import { Collapsible } from "radix-ui"
import { toast } from "sonner"

import { permissionMenus } from "@/components/app-sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { roleGrantsCode } from "@/lib/access"
import { isPlatformAdmin, useCurrentUser } from "@/lib/current-user"
import { saveUserExtraPermissions, useAdminUsers, type AdminUser } from "@/lib/global-settings"
import { cn } from "@/lib/utils"

const LIST_HREF = "/users"

// Per code: follow the role, or override it with an extra allow / deny.
type Choice = "role" | "allow" | "deny"

// Legacy Users/ExtraPermission: the user's roles and counts on top, then the
// menu tree where each item can be allowed or denied for this user alone.
// Here each code also shows what the role gives and what the user ends up
// with, and changes are saved together rather than on every click.
export function UserExtraPermission({ userId }: { userId: number }) {
  const users = useAdminUsers()
  const user = users.find((u) => u.id === userId)
  if (!user) {
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
  return <Editor key={user.id} user={user} />
}

function Editor({ user }: { user: AdminUser }) {
  const me = useCurrentUser()
  const menus = React.useMemo(() => permissionMenus(), [])
  const [choices, setChoices] = React.useState(() => choicesOf(user))
  const [query, setQuery] = React.useState("")
  const [open, setOpen] = React.useState<ReadonlySet<string>>(() => new Set())
  const superAdmin = isPlatformAdmin(user)

  const saved = choicesOf(user)
  const dirty = [...new Set([...choices.keys(), ...saved.keys()])].some((code) => choices.get(code) !== saved.get(code))
  const allowCount = [...choices.values()].filter((c) => c === "allow").length
  const denyCount = [...choices.values()].filter((c) => c === "deny").length

  const q = query.trim().toLowerCase()
  const shown = menus.flatMap((menu) => {
    const items = q && !menu.title.toLowerCase().includes(q)
      ? menu.items.filter((item) => item.title.toLowerCase().includes(q))
      : menu.items
    return items.length ? [{ ...menu, items }] : []
  })

  function choose(code: string, choice: Choice) {
    setChoices((current) => {
      const next = new Map(current)
      if (choice === "role") next.delete(code)
      else next.set(code, choice)
      return next
    })
  }

  function save() {
    const pick = (want: Choice) => [...choices].filter(([, c]) => c === want).map(([code]) => code)
    saveUserExtraPermissions(user.id, pick("allow"), pick("deny"), me.name)
    toast.success(`Extra permissions of ${user.userName} saved`)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div>
        <Button asChild variant="link" className="h-auto px-0 text-muted-foreground">
          <Link href={LIST_HREF}>
            <ArrowLeftIcon data-icon="inline-start" />
            Manage Users
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">Extra Permission</h2>
        <p className="text-sm text-muted-foreground">
          Allow or deny menus for this user alone, on top of what their role gives. A deny always wins.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Fact label="User Name" value={user.userName} />
          <Fact label="Full Name" value={user.name} />
          <Fact label="Role" value={user.role} />
          <Fact label="Extra Allow" value={String(allowCount)} />
          <Fact label="Extra Deny" value={String(denyCount)} />
          <Fact label="Menus" value={String(menus.length)} />
        </CardContent>
      </Card>

      {superAdmin ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          A super admin holds every permission, so extra permissions don&apos;t apply.
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
            <div className="flex gap-2">
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
              const allows = codes.filter((c) => choices.get(c) === "allow").length
              const denies = codes.filter((c) => choices.get(c) === "deny").length
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
                  <Collapsible.Trigger asChild>
                    <button
                      type="button"
                      className="group flex w-full items-center gap-2 px-4 py-3 text-left font-medium hover:bg-muted/50"
                    >
                      <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                      <span className="flex-1">{menu.title}</span>
                      {allows > 0 && (
                        <Badge variant="outline" className="border-transparent bg-green-500/15 text-green-700 dark:text-green-400">
                          {allows} allowed
                        </Badge>
                      )}
                      {denies > 0 && (
                        <Badge variant="outline" className="border-transparent bg-destructive/10 text-destructive">
                          {denies} denied
                        </Badge>
                      )}
                    </button>
                  </Collapsible.Trigger>
                  <Collapsible.Content className="divide-y border-t">
                    {menu.items.map((item) => (
                      <div key={item.title} className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]">
                        <span className="text-sm">{item.title}</span>
                        <div className="flex flex-col gap-2">
                          {item.codes.map(({ code, label }) => (
                            <CodeRow
                              key={code}
                              label={label}
                              byRole={roleGrantsCode(user.role, code)}
                              choice={choices.get(code) ?? "role"}
                              onChange={(choice) => choose(code, choice)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </Collapsible.Content>
                </Collapsible.Root>
              )
            })}
          </div>

          <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t bg-background px-4 py-3 lg:-mx-6 lg:px-6">
            {dirty && <span className="mr-auto text-sm text-muted-foreground">Unsaved changes</span>}
            <Button variant="outline" disabled={!dirty} onClick={() => setChoices(choicesOf(user))}>
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

function choicesOf(user: AdminUser) {
  return new Map<string, Choice>([
    ...user.extraAllow.map((code) => [code, "allow"] as const),
    ...user.extraDeny.map((code) => [code, "deny"] as const),
  ])
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  )
}

// One permission: the surface, what the role gives, the override, and the
// result.
function CodeRow({
  label,
  byRole,
  choice,
  onChange,
}: {
  label: string
  byRole: boolean
  choice: Choice
  onChange: (choice: Choice) => void
}) {
  const result = choice === "role" ? byRole : choice === "allow"
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-16 text-sm text-muted-foreground">{label}</span>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        spacing={0}
        value={choice}
        onValueChange={(value) => value && onChange(value as Choice)}
        aria-label={`${label} permission`}
      >
        <ToggleGroupItem value="role" className="px-3">
          Role ({byRole ? "yes" : "no"})
        </ToggleGroupItem>
        <ToggleGroupItem
          value="allow"
          className="px-3 data-[state=on]:bg-green-500/15 data-[state=on]:text-green-700 dark:data-[state=on]:text-green-400"
        >
          Allow
        </ToggleGroupItem>
        <ToggleGroupItem
          value="deny"
          className="px-3 data-[state=on]:bg-destructive/10 data-[state=on]:text-destructive"
        >
          Deny
        </ToggleGroupItem>
      </ToggleGroup>
      <span
        className={cn("flex items-center gap-1 text-xs", result ? "text-green-700 dark:text-green-400" : "text-muted-foreground")}
        title={result ? "The user has this permission" : "The user doesn't have this permission"}
      >
        {result ? <CheckIcon className="size-3.5" /> : <XIcon className="size-3.5" />}
        {result ? "Has access" : "No access"}
      </span>
    </div>
  )
}
