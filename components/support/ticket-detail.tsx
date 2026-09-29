"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, LockIcon } from "lucide-react"
import { toast } from "sonner"

import { TicketPriorityBadge, TicketStatusBadge } from "@/components/support/ticket-badges"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { isPlatformAdmin, useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { useAdminUsers } from "@/lib/global-settings"
import {
  addTicketMessage,
  ticketPriorities,
  ticketStatuses,
  updateTicket,
  useSupportTickets,
  visibleMessages,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/support-tickets"
import { cn } from "@/lib/utils"

const UNASSIGNED = "unassigned"

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

// A ticket's conversation. The platform team also sees internal notes and
// can change the status, priority and assignee; institute users can reply.
export function TicketDetail({ id }: { id: number }) {
  const user = useCurrentUser()
  const platform = isPlatformAdmin(user)
  const institutes = useAccessibleInstitutes()
  const users = useAdminUsers()
  const ticket = useSupportTickets().find((t) => t.id === id)
  const [body, setBody] = React.useState("")
  const [mode, setMode] = React.useState<"reply" | "note">("reply")

  const institute = ticket && institutes.find((i) => i.id === ticket.instituteId)
  if (!ticket || !institute) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Ticket not found</h2>
        <p className="text-sm text-muted-foreground">It may belong to an institute you don&apos;t work with.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/support">Back to support</Link>
        </Button>
      </div>
    )
  }

  const closed = ticket.status === "Closed"
  const note = platform && mode === "note"
  const staff = users.filter((u) => isPlatformAdmin(u))
  const actor = { id: user.id, name: user.name, platform }

  function send(event: React.FormEvent) {
    event.preventDefault()
    if (!ticket || !body.trim()) return
    addTicketMessage(ticket.id, body, note, actor)
    setBody("")
    toast.success(note ? "Internal note added" : "Reply sent")
  }

  function change(changes: Parameters<typeof updateTicket>[1], message: string) {
    if (!ticket) return
    updateTicket(ticket.id, changes, user.name)
    toast.success(message)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div>
        <Button asChild variant="link" className="h-auto px-0 text-muted-foreground">
          <Link href="/support">
            <ArrowLeftIcon data-icon="inline-start" />
            Support tickets
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">{ticket.subject}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{ticket.ticketNo}</span>·<span>{institute.name}</span>·<span>{ticket.category}</span>
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 @4xl/main:grid-cols-3">
        <div className="flex flex-col gap-4 @4xl/main:col-span-2">
          <ol className="flex flex-col gap-3">
            {visibleMessages(ticket, platform).map((m) => (
              <li
                key={m.id}
                className={cn(
                  "rounded-lg border p-4",
                  m.internal && "border-dashed border-amber-500/50 bg-amber-500/5",
                  !m.internal && m.fromPlatform && "bg-muted/40"
                )}
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{m.authorName}</span>
                  {m.fromPlatform && <span className="text-xs text-muted-foreground">Support</span>}
                  {m.internal && (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                      <LockIcon className="size-3" /> Internal note
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">{when(m.at)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{m.body}</p>
              </li>
            ))}
          </ol>

          {closed ? (
            <p className="text-sm text-muted-foreground">
              This ticket is closed. {platform ? "Reopen it to reply." : "Raise a new ticket if you still need help."}
            </p>
          ) : (
            <form onSubmit={send}>
              <Card className="gap-3 py-4">
                <CardContent className="grid gap-3">
                  {platform && (
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      size="sm"
                      value={mode}
                      onValueChange={(v) => v && setMode(v as typeof mode)}
                      className="w-fit"
                    >
                      <ToggleGroupItem value="reply" className="px-3">
                        Reply
                      </ToggleGroupItem>
                      <ToggleGroupItem value="note" className="px-3">
                        Internal note
                      </ToggleGroupItem>
                    </ToggleGroup>
                  )}
                  <Textarea
                    rows={4}
                    aria-label={note ? "Internal note" : "Reply"}
                    placeholder={note ? "Only the platform team sees this." : "Write a reply…"}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className={cn(note && "border-amber-500/50")}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={!body.trim()}>
                      {note ? "Add note" : "Send reply"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>
              Raised by {ticket.raisedByName} on {when(ticket.createdAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {platform ? (
              <>
                <FilterField
                  label="Status"
                  value={ticket.status}
                  onChange={(v) => change({ status: v as TicketStatus }, `Status set to ${v}`)}
                  options={ticketStatuses.map((s) => ({ value: s, label: s }))}
                />
                <FilterField
                  label="Priority"
                  value={ticket.priority}
                  onChange={(v) => change({ priority: v as TicketPriority }, `Priority set to ${v}`)}
                  options={ticketPriorities.map((p) => ({ value: p, label: p }))}
                />
                <FilterField
                  label="Assignee"
                  value={ticket.assigneeId == null ? UNASSIGNED : String(ticket.assigneeId)}
                  onChange={(v) =>
                    change(
                      { assigneeId: v === UNASSIGNED ? null : Number(v) },
                      v === UNASSIGNED ? "Unassigned" : `Assigned to ${staff.find((u) => String(u.id) === v)?.name}`
                    )
                  }
                  options={[
                    { value: UNASSIGNED, label: "Unassigned" },
                    ...staff.map((u) => ({ value: String(u.id), label: u.name })),
                  ]}
                />
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {ticket.status === "Waiting on institute"
                    ? "The platform team is waiting for your reply."
                    : ticket.status === "Resolved"
                      ? "Marked resolved. Reply if the problem is back, or close it."
                      : "The platform team will reply here."}
                </p>
                {!closed && (
                  <Button
                    variant="outline"
                    onClick={() => change({ status: "Closed" }, "Ticket closed")}
                  >
                    Close ticket
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
