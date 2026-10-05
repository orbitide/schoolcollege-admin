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
  PauseIcon,
  PencilIcon,
  PlayIcon,
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
import { ApiError } from "@/lib/http-client"
import type { Institute } from "@/lib/institutes"
import {
  deleteInstitute,
  deleteInstitutePermanently,
  getInstituteMaxRank,
  retrieveInstitute,
  setInstituteRank,
  setInstituteStatus,
  toggleInstituteRecordStatus,
} from "@/lib/institutes-store"

type Confirm = "delete" | "retrieve" | "permanent"

// Row menu of the legacy institute grids. What it offers depends on the
// surface (`can`) and the record status: a deleted institute can only be
// retrieved or deleted for good.
export function InstituteSurfaceActions({
  institute,
  returnTo,
  can,
}: {
  institute: Institute
  returnTo: string
  can: Capabilities & { saasStatus?: boolean }
}) {
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)
  const [ranking, setRanking] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const deleted = institute.recordStatus === "Deleted"
  const active = institute.recordStatus === "Active"
  const suspended = institute.status === "Suspended"

  async function toggleSaasStatus() {
    try {
      await setInstituteStatus(institute.id, suspended ? "Active" : "Suspended")
      toast.success(`${institute.name} ${suspended ? "reactivated" : "suspended"}`)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  async function toggleStatus() {
    try {
      await toggleInstituteRecordStatus(institute.id)
      // Legacy StatusUpdate messages.
      toast.success(active ? "In-activated successfully" : "Activated Successfully")
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const dialogs: Record<
    Confirm,
    { title: string; description: string; action: string; destructive?: boolean; run: () => Promise<unknown>; done: string }
  > = {
    delete: {
      title: `Delete ${institute.name}?`,
      description:
        "The institute leaves every list and its users can't work in it. You can retrieve it later from “With deleted”.",
      action: "Delete",
      destructive: true,
      run: () => deleteInstitute(institute.id),
      done: "Institute deleted successfully",
    },
    retrieve: {
      title: `Retrieve ${institute.name}?`,
      description: "The institute comes back as active, keeping its rank unless another institute took it.",
      action: "Retrieve",
      run: () => retrieveInstitute(institute.id),
      done: "Institute retrieve successfully",
    },
    permanent: {
      title: `Permanently delete ${institute.name}?`,
      description:
        "The institute, its user links and everything the admin still keeps for it are removed for good. This cannot be undone.",
      action: "Delete permanently",
      destructive: true,
      run: () => deleteInstitutePermanently(institute.id),
      done: "Institute deleted successfully",
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
          {!deleted && (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/institutes/${institute.id}`}>
                  <EyeIcon />
                  Details
                </Link>
              </DropdownMenuItem>
              {can.edit && (
                <DropdownMenuItem asChild>
                  <Link href={`/institutes/${institute.id}/edit?returnTo=${encodeURIComponent(returnTo)}`}>
                    <PencilIcon />
                    Edit
                  </Link>
                </DropdownMenuItem>
              )}
              {can.status && (
                <DropdownMenuItem onSelect={toggleStatus}>
                  {active ? <CircleMinusIcon /> : <CircleCheckIcon />}
                  {active ? "Inactivate" : "Activate"}
                </DropdownMenuItem>
              )}
              {can.saasStatus && (
                <DropdownMenuItem onSelect={toggleSaasStatus}>
                  {suspended ? <PlayIcon /> : <PauseIcon />}
                  {suspended ? "Reactivate" : "Suspend"}
                </DropdownMenuItem>
              )}
              {can.reorder && (
                <DropdownMenuItem onSelect={() => setRanking(true)}>
                  <ArrowUpDownIcon />
                  Change rank
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
          {ranking && <RankForm institute={institute} onDone={() => setRanking(false)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

// The legacy rank modal: the maximum rank (GetMaxRank) and the rank to move
// to. The API applies legacy UpdateRank's rules and messages.
function RankForm({ institute, onDone }: { institute: Institute; onDone: () => void }) {
  const id = React.useId()
  const [max, setMax] = React.useState<number>()
  const [value, setValue] = React.useState("")
  const [error, setError] = React.useState<string>()
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    getInstituteMaxRank(institute.id).then(setMax, (reason: Error) => setError(reason.message))
  }, [institute.id])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const rank = Number(value)
    if (!value || !Number.isInteger(rank) || rank <= 0) {
      setError("Rank field can not be empty or zero or invalid.")
      return
    }
    setPending(true)
    try {
      await setInstituteRank(institute.id, rank, institute.rank)
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
          {institute.name} is at rank {institute.rank}
          {max ? ` of ${max}` : ""}. Institutes in between move by one.
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
