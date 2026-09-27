"use client"

import * as React from "react"
import Link from "next/link"
import {
  CalendarCheckIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  kindConfig,
  type AcademicKind,
  type EditableRecord,
} from "@/components/institutes/academic/kinds"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { studentsUsing } from "@/lib/students"

// Row menu shared by the per-institute lists and the all-institutes admin
// lists: edit, set current, (in)activate and delete with its confirmation.
export function RecordActions({
  kind,
  record,
  singular,
  instituteName,
  editHref,
}: {
  kind: AcademicKind
  record: EditableRecord
  singular: string
  instituteName: string
  editHref: string
}) {
  const config = kindConfig(kind)
  const hasCurrent = config.fields.some((field) => field.current)
  const [deleting, setDeleting] = React.useState(false)

  function toggleStatus() {
    const next = record.status === "Active" ? "Inactive" : "Active"
    config.store.setStatus(record.id, next)
    toast.success(`${record.name} ${next === "Active" ? "activated" : "inactivated"}`)
  }

  function makeCurrent() {
    config.store.setCurrent(record.id)
    toast.success(`${record.name} is now the current ${singular.toLowerCase()}`)
  }

  // Records other records still point at can't be deleted yet.
  function requestDelete() {
    const { studentMatch } = config
    const reason =
      config.inUse?.(record) ??
      (studentMatch &&
        studentsUsing(record.instituteId, (student, enrolment) =>
          studentMatch(record, student, enrolment)
        ))
    if (reason) {
      toast.error(`${record.name} can't be deleted`, {
        description: `${reason} Move or delete those first, or inactivate it instead.`,
      })
      return
    }
    setDeleting(true)
  }

  function remove() {
    config.store.remove(record.id)
    toast.success(`${record.name} deleted`)
    setDeleting(false)
  }

  return (
    <>
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
          <DropdownMenuItem asChild>
            <Link href={editHref}>
              <PencilIcon />
              Edit
            </Link>
          </DropdownMenuItem>
          {hasCurrent && !record.isCurrent && (
            <DropdownMenuItem onSelect={makeCurrent}>
              <CalendarCheckIcon />
              Set as current
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={toggleStatus}>
            {record.status === "Active" ? <CircleMinusIcon /> : <CircleCheckIcon />}
            {record.status === "Active" ? "Inactivate" : "Activate"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={requestDelete}>
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {record.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the {singular.toLowerCase()} from {instituteName}. This
              cannot be undone.
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
    </>
  )
}
