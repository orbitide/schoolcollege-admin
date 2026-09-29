"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"
import { toast } from "sonner"

import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { isPlatformAdmin, useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import {
  addTicket,
  ticketCategories,
  ticketErrors,
  ticketPriorities,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/support-tickets"

// Raise a ticket: an institute user for one of their institutes, or the
// platform team on an institute's behalf.
export function TicketForm() {
  const router = useRouter()
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const [instituteId, setInstituteId] = React.useState(institutes.length === 1 ? String(institutes[0].id) : "")
  const [subject, setSubject] = React.useState("")
  const [category, setCategory] = React.useState<TicketCategory>("Technical")
  const [priority, setPriority] = React.useState<TicketPriority>("Normal")
  const [body, setBody] = React.useState("")
  const [errors, setErrors] = React.useState<ReturnType<typeof ticketErrors>>({})

  function save(event: React.FormEvent) {
    event.preventDefault()
    const input = { instituteId: Number(instituteId), subject, category, priority, body }
    const found = ticketErrors(input)
    setErrors(found)
    if (Object.keys(found).length) {
      toast.error("Check the highlighted fields.")
      return
    }
    const ticket = addTicket(input, { id: user.id, name: user.name, platform: isPlatformAdmin(user) })
    toast.success(`${ticket.ticketNo} raised`)
    router.push(`/support/${ticket.id}`)
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div>
        <Button asChild variant="link" className="h-auto px-0 text-muted-foreground">
          <Link href="/support">
            <ArrowLeftIcon data-icon="inline-start" />
            Support tickets
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">New ticket</h2>
      </div>
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>What do you need help with?</CardTitle>
          <CardDescription>The platform team replies here, usually within a working day.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {institutes.length > 1 && (
            <div className="sm:col-span-2">
              <FilterField
                label="Institute"
                required
                value={instituteId}
                onChange={setInstituteId}
                placeholder="Select an institute"
                error={errors.instituteId}
                options={[...institutes]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((i) => ({ value: String(i.id), label: i.name }))}
              />
            </div>
          )}
          <Field data-invalid={!!errors.subject || undefined} className="sm:col-span-2">
            <FieldLabel htmlFor="ticket-subject">Subject</FieldLabel>
            <Input id="ticket-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <FieldError>{errors.subject}</FieldError>
          </Field>
          <FilterField
            label="Category"
            value={category}
            onChange={(v) => setCategory(v as TicketCategory)}
            options={ticketCategories.map((c) => ({ value: c, label: c }))}
          />
          <FilterField
            label="Priority"
            value={priority}
            onChange={(v) => setPriority(v as TicketPriority)}
            options={ticketPriorities.map((p) => ({ value: p, label: p }))}
          />
          <Field data-invalid={!!errors.body || undefined} className="sm:col-span-2">
            <FieldLabel htmlFor="ticket-body">Details</FieldLabel>
            <Textarea
              id="ticket-body"
              rows={6}
              placeholder="What happened, where, and what you expected. Include class, section or student IDs if relevant."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <FieldError>{errors.body}</FieldError>
          </Field>
        </CardContent>
      </Card>
      <div className="flex max-w-3xl justify-end gap-2">
        <Button asChild variant="outline">
          <Link href="/support">Cancel</Link>
        </Button>
        <Button type="submit">Raise ticket</Button>
      </div>
    </form>
  )
}
