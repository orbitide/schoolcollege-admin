"use client"

import * as React from "react"
import Link from "next/link"
import { PlusIcon, SearchIcon } from "lucide-react"

import { TicketPriorityBadge, TicketStatusBadge } from "@/components/support/ticket-badges"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { isPlatformAdmin, useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { useAdminUsers } from "@/lib/global-settings"
import {
  openTicketStatuses,
  ticketPriorities,
  ticketStatuses,
  useSupportTickets,
  visibleMessages,
} from "@/lib/support-tickets"

const OPEN = "open"
const UNASSIGNED = "unassigned"

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days < 30 ? `${days} d ago` : new Date(iso).toLocaleDateString()
}

// Support tickets. The platform team sees every institute's and can filter
// by assignee; institute users see only their institutes' tickets.
export function TicketList() {
  const user = useCurrentUser()
  const platform = isPlatformAdmin(user)
  const institutes = useAccessibleInstitutes()
  const users = useAdminUsers()
  const tickets = useSupportTickets()
  const [status, setStatus] = React.useState(OPEN)
  const [priority, setPriority] = React.useState("")
  const [institute, setInstitute] = React.useState("")
  const [assignee, setAssignee] = React.useState("")
  const [search, setSearch] = React.useState("")

  const allowed = new Set(institutes.map((i) => i.id))
  const staff = users.filter((u) => isPlatformAdmin(u))
  const nameOf = (id: number) => institutes.find((i) => i.id === id)?.name ?? `Institute #${id}`
  const query = search.trim().toLowerCase()

  const rows = tickets
    .filter(
      (t) =>
        allowed.has(t.instituteId) &&
        (status === "" || (status === OPEN ? openTicketStatuses.includes(t.status) : t.status === status)) &&
        (!priority || t.priority === priority) &&
        (!institute || String(t.instituteId) === institute) &&
        (!assignee || (assignee === UNASSIGNED ? t.assigneeId == null : String(t.assigneeId) === assignee)) &&
        (!query || t.subject.toLowerCase().includes(query) || t.ticketNo.toLowerCase().includes(query))
    )
    .sort(
      (a, b) =>
        ticketPriorities.indexOf(b.priority) - ticketPriorities.indexOf(a.priority) ||
        b.modifiedAt.localeCompare(a.modifiedAt)
    )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Support tickets</h2>
          <p className="text-sm text-muted-foreground">
            {platform
              ? "Help requests from every institute."
              : "Ask the platform team for help and follow your requests."}
          </p>
        </div>
        <Button asChild>
          <Link href="/support/new">
            <PlusIcon data-icon="inline-start" />
            New ticket
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <FilterField
            label="Status"
            value={status}
            onChange={setStatus}
            allLabel="All statuses"
            options={[{ value: OPEN, label: "Open (not resolved)" }, ...ticketStatuses.map((s) => ({ value: s, label: s }))]}
          />
          <FilterField
            label="Priority"
            value={priority}
            onChange={setPriority}
            allLabel="All priorities"
            options={ticketPriorities.map((p) => ({ value: p, label: p }))}
          />
          {institutes.length > 1 && (
            <FilterField
              label="Institute"
              value={institute}
              onChange={setInstitute}
              allLabel="All institutes"
              options={[...institutes]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((i) => ({ value: String(i.id), label: i.name }))}
            />
          )}
          {platform && (
            <FilterField
              label="Assignee"
              value={assignee}
              onChange={setAssignee}
              allLabel="Anyone"
              options={[
                { value: UNASSIGNED, label: "Unassigned" },
                ...staff.map((u) => ({ value: String(u.id), label: u.name })),
              ]}
            />
          )}
          <div className="grid gap-2">
            <span className="text-sm font-medium">Search</span>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Subject or ticket no."
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
              <TableHead>Ticket</TableHead>
              {institutes.length > 1 && <TableHead>Institute</TableHead>}
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              {platform && <TableHead>Assignee</TableHead>}
              <TableHead className="text-right">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No tickets match your filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="max-w-96">
                    <Link href={`/support/${t.id}`} className="font-medium hover:underline">
                      {t.subject}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {t.ticketNo} · {t.raisedByName} · {visibleMessages(t, platform).length} messages
                    </div>
                  </TableCell>
                  {institutes.length > 1 && <TableCell>{nameOf(t.instituteId)}</TableCell>}
                  <TableCell>{t.category}</TableCell>
                  <TableCell>
                    <TicketPriorityBadge priority={t.priority} />
                  </TableCell>
                  <TableCell>
                    <TicketStatusBadge status={t.status} />
                  </TableCell>
                  {platform && (
                    <TableCell>
                      {t.assigneeId == null ? (
                        <span className="text-muted-foreground">Unassigned</span>
                      ) : (
                        (users.find((u) => u.id === t.assigneeId)?.name ?? "—")
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                    {timeAgo(t.modifiedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
