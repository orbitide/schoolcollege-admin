"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArchiveRestoreIcon,
  ArrowUpDownIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

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
import { Input } from "@/components/ui/input"
import type { Capabilities } from "@/lib/access"
import { useCurrentUser } from "@/lib/current-user"
import {
  deleteHoliday,
  deleteHolidayPermanently,
  maxHolidayRank,
  retrieveHoliday,
  setHolidayRank,
  toggleHolidayStatus,
} from "@/lib/holidays"
import type { HolidayEvent } from "@/lib/institutes"

type Confirm = "delete" | "retrieve" | "permanent"

// Row menu of the legacy grid. What it offers depends on the surface (`can`)
// and the status: deleted ones can only be viewed, retrieved or deleted for
// good.
export function HolidayActions({
  holiday,
  returnTo,
  editHref,
  can,
}: {
  holiday: HolidayEvent
  returnTo: string
  editHref: string
  can: Capabilities
}) {
  const user = useCurrentUser()
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)
  const [ranking, setRanking] = React.useState(false)
  const deleted = holiday.status === "Deleted"

  function toggleStatus() {
    toggleHolidayStatus(holiday.id, user.name)
    toast.success(holiday.status === "Active" ? "In-activated successfully" : "Activated successfully")
  }

  const dialogs: Record<
    Confirm,
    { title: string; description: string; action: string; destructive?: boolean; run: () => void; done: string }
  > = {
    delete: {
      title: `Delete "${holiday.name}"?`,
      description:
        "It stops counting as a holiday and gives up its rank. An admin can retrieve it later from “With Deleted”.",
      action: "Delete",
      destructive: true,
      run: () => deleteHoliday(holiday.id, user.name),
      done: "Holiday and event deleted successfully",
    },
    retrieve: {
      title: `Retrieve "${holiday.name}"?`,
      description: "It comes back as active, last in rank.",
      action: "Retrieve",
      run: () => retrieveHoliday(holiday.id, user.name),
      done: "Holiday and event retrieved successfully",
    },
    permanent: {
      title: `Permanently delete "${holiday.name}"?`,
      description: "It is removed for good. This cannot be undone.",
      action: "Permanent Delete",
      destructive: true,
      run: () => deleteHolidayPermanently(holiday.id),
      done: "Holiday and event deleted successfully",
    },
  }
  const dialog = confirm ? dialogs[confirm] : null

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
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/basic-settings/holidays/${holiday.id}?returnTo=${encodeURIComponent(returnTo)}`}>
              <EyeIcon />
              Details
            </Link>
          </DropdownMenuItem>
          {!deleted && (
            <>
              {can.edit && (
                <DropdownMenuItem asChild>
                  <Link href={editHref}>
                    <PencilIcon />
                    Edit
                  </Link>
                </DropdownMenuItem>
              )}
              {can.status && (
                <DropdownMenuItem onSelect={toggleStatus}>
                  {holiday.status === "Active" ? <CircleMinusIcon /> : <CircleCheckIcon />}
                  {holiday.status === "Active" ? "Inactive" : "Active"}
                </DropdownMenuItem>
              )}
              {can.reorder && (
                <DropdownMenuItem onSelect={() => setRanking(true)}>
                  <ArrowUpDownIcon />
                  Rank
                </DropdownMenuItem>
              )}
            </>
          )}
          {deleted && can.restore && (
            <DropdownMenuItem onSelect={() => setConfirm("retrieve")}>
              <ArchiveRestoreIcon />
              Retrieve
            </DropdownMenuItem>
          )}
          {can.delete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setConfirm(deleted ? "permanent" : "delete")}
              >
                <Trash2Icon />
                {deleted ? "Permanent Delete" : "Delete"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!dialog} onOpenChange={(open) => !open && setConfirm(null)}>
        {dialog && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{dialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{dialog.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant={dialog.destructive ? "destructive" : "default"}
                onClick={() => {
                  dialog.run()
                  toast.success(dialog.done)
                  setConfirm(null)
                }}
              >
                {dialog.action}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      <Dialog open={ranking} onOpenChange={setRanking}>
        <DialogContent className="sm:max-w-sm">
          {ranking && <RankForm holiday={holiday} onDone={() => setRanking(false)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

// The legacy rank modal: current / maximum rank within the holiday's
// institute, medium and class, and the new rank to move to.
function RankForm({ holiday, onDone }: { holiday: HolidayEvent; onDone: () => void }) {
  const user = useCurrentUser()
  const id = React.useId()
  const max = maxHolidayRank(holiday)
  const [value, setValue] = React.useState("")
  const [error, setError] = React.useState<string>()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const rank = Number(value)
    if (!value || !Number.isInteger(rank) || rank <= 0) {
      setError("Rank field can't be empty or zero.")
    } else if (rank > max) {
      setError("New rank cannot be greater than current maximum order.")
    } else if (rank === holiday.rank) {
      setError("New and old rank cannot be same.")
    } else {
      setHolidayRank(holiday.id, rank, user.name)
      toast.success("Rank updated successfully")
      onDone()
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Update rank</DialogTitle>
        <DialogDescription>
          Current rank / maximum rank: {holiday.rank} / {max}, among holidays of the same
          institute, medium and class.
        </DialogDescription>
      </DialogHeader>
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor={id}>New rank</FieldLabel>
        <Input
          id={id}
          inputMode="numeric"
          autoFocus
          value={value}
          placeholder={`1 – ${max}`}
          aria-invalid={!!error}
          onChange={(event) => {
            setValue(event.target.value.replace(/\D/g, ""))
            setError(undefined)
          }}
        />
        <FieldError>{error}</FieldError>
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">Update</Button>
      </DialogFooter>
    </form>
  )
}
