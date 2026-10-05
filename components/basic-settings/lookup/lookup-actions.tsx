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

import type { LookupPage } from "@/components/basic-settings/lookup/lookup-page"
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { ApiError } from "@/lib/http-client"
import type { LookupRow } from "@/lib/lookup-store"

type Confirm = "delete" | "retrieve" | "permanent"

// Row menu of a legacy lookup grid: what it offers depends on the surface
// (`can`); a deleted row can only be retrieved or deleted for good.
export function LookupActions({
  page,
  row,
  returnTo,
  can,
}: {
  page: LookupPage
  row: LookupRow
  returnTo: string
  can: Capabilities
}) {
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)
  const [ranking, setRanking] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const deleted = row.recordStatus === "Deleted"
  const active = row.recordStatus === "Active"
  const base = `/basic-settings/${page.segment}/${row.id}`
  const back = `?returnTo=${encodeURIComponent(returnTo)}`
  const lower = page.singular.toLowerCase()

  async function toggleStatus() {
    try {
      await page.store.toggleStatus(row.id)
      toast.success(active ? "In-activated successfully" : "Activated successfully")
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const dialogs: Record<
    Confirm,
    { title: string; description: string; action: string; destructive?: boolean; run: () => Promise<unknown>; done: string }
  > = {
    delete: {
      title: `Delete ${row.name}?`,
      description: `The ${lower} leaves every list and picker. Manage Admin can retrieve it later from “With deleted”.`,
      action: "Delete",
      destructive: true,
      run: () => page.store.remove(row.id),
      done: `${page.singular} deleted successfully`,
    },
    retrieve: {
      title: `Retrieve ${row.name}?`,
      description: `The ${lower} comes back as active, keeping its rank unless another ${lower} took it.`,
      action: "Retrieve",
      run: () => page.store.retrieve(row.id),
      done: `${page.singular} retrieve successfully`,
    },
    permanent: {
      title: `Permanently delete ${row.name}?`,
      description: `The ${lower} is removed for good. This cannot be undone.`,
      action: "Delete permanently",
      destructive: true,
      run: () => page.store.removePermanently(row.id),
      done: `${page.singular} deleted successfully`,
    },
  }
  const dialog = confirm ? dialogs[confirm] : null

  async function runDialog() {
    if (!dialog) return
    setPending(true)
    try {
      await dialog.run()
      toast.success(dialog.done)
      setConfirm(null)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground data-[state=open]:bg-muted">
            <EllipsisVerticalIcon />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`${base}${back}`}>
              <EyeIcon />
              Details
            </Link>
          </DropdownMenuItem>
          {!deleted && can.edit && (
            <DropdownMenuItem asChild>
              <Link href={`${base}/edit${back}`}>
                <PencilIcon />
                Edit
              </Link>
            </DropdownMenuItem>
          )}
          {!deleted && can.status && (
            <DropdownMenuItem onSelect={toggleStatus}>
              {active ? <CircleMinusIcon /> : <CircleCheckIcon />}
              {active ? "Inactivate" : "Activate"}
            </DropdownMenuItem>
          )}
          {!deleted && can.reorder && (
            <DropdownMenuItem onSelect={() => setRanking(true)}>
              <ArrowUpDownIcon />
              Change rank
            </DropdownMenuItem>
          )}
          {deleted && can.restore && (
            <DropdownMenuItem onSelect={() => setConfirm("retrieve")}>
              <ArchiveRestoreIcon />
              Retrieve
            </DropdownMenuItem>
          )}
          {can.delete && (!deleted || can.restore) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(deleted ? "permanent" : "delete")}>
                <Trash2Icon />
                {deleted ? "Delete permanently" : "Delete"}
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
                disabled={pending}
                onClick={(event) => {
                  // Stays open until the API has answered.
                  event.preventDefault()
                  void runDialog()
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
          {ranking && <RankForm page={page} row={row} onDone={() => setRanking(false)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

// The legacy rank modal: the institute's maximum rank (GetMaxRank) and the
// rank to move to. The API applies legacy UpdateRank's rules and messages.
function RankForm({ page, row, onDone }: { page: LookupPage; row: LookupRow; onDone: () => void }) {
  const id = React.useId()
  const [max, setMax] = React.useState<number>()
  const [value, setValue] = React.useState("")
  const [error, setError] = React.useState<string>()
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    page.store.getMaxRank(row.id).then(setMax, (reason: Error) => setError(reason.message))
  }, [page, row.id])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const rank = Number(value)
    if (!value || !Number.isInteger(rank) || rank <= 0) {
      setError("Rank field can not be empty or zero or invalid.")
      return
    }
    setPending(true)
    try {
      await page.store.setRank(row.id, rank, row.rank)
      toast.success("Rank updated successfully")
      onDone()
    } catch (reason) {
      setError(reason instanceof ApiError ? (reason.fieldErrors.newRank ?? reason.message) : (reason as Error).message)
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Change rank</DialogTitle>
        <DialogDescription>
          {row.name} is at rank {row.rank}
          {max ? ` of ${max}` : ""}. {page.plural} in between move by one.
        </DialogDescription>
      </DialogHeader>
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor={id}>New rank</FieldLabel>
        <Input
          id={id}
          inputMode="numeric"
          autoFocus
          value={value}
          placeholder={max ? `1 – ${max}` : ""}
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
        <Button type="submit" disabled={pending}>
          Update rank
        </Button>
      </DialogFooter>
    </form>
  )
}
