"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArchiveRestoreIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { StatusBadge } from "@/components/institutes/status-badge"
import { FilterField, stamp } from "@/components/term-exams/term-exam-fields"
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
import { Card, CardContent } from "@/components/ui/card"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCurrentUser } from "@/lib/current-user"
import {
  deleteDistrict,
  deleteDistrictPermanently,
  maxDistrictRank,
  retrieveDistrict,
  setDistrictRank,
  toggleDistrictStatus,
  useAllDistricts,
  type District,
} from "@/lib/districts"
import { studentsUsing } from "@/lib/students"

export const DISTRICTS_HREF = "/basic-settings/districts"

type SortKey = "name" | "nameBn" | "rank"

// Legacy District/ManageAdmin: one district list shared by all institutes,
// ordered by name unless another column is picked.
export function DistrictList() {
  const all = useAllDistricts()
  const [withDeleted, setWithDeleted] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [sort, setSort] = React.useState<{ key: SortKey; desc: boolean }>({
    key: "name",
    desc: false,
  })

  const needle = query.trim().toLowerCase()
  const rows = all
    .filter(
      (d) =>
        (withDeleted || d.status !== "Deleted") &&
        (!needle ||
          d.name.toLowerCase().includes(needle) ||
          d.nameBn.toLowerCase().includes(needle))
    )
    .sort((a, b) => {
      const order =
        sort.key === "rank" ? a.rank - b.rank : a[sort.key].localeCompare(b[sort.key])
      return sort.desc ? -order : order
    })

  function sortBy(key: SortKey) {
    setSort((current) => ({ key, desc: current.key === key && !current.desc }))
  }

  const sortHead = (key: SortKey, label: string) => (
    <TableHead aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button
        type="button"
        onClick={() => sortBy(key)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {sort.key !== key ? (
          <ArrowUpDownIcon className="size-3.5 opacity-50" />
        ) : sort.desc ? (
          <ArrowDownIcon className="size-3.5" />
        ) : (
          <ArrowUpIcon className="size-3.5" />
        )}
      </button>
    </TableHead>
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Manage District (Admin)</h2>
          <p className="text-sm text-muted-foreground">
            Districts institutes and students are located in, shared by every institute.
          </p>
        </div>
        <Button asChild>
          <Link href={`${DISTRICTS_HREF}/new`}>
            <PlusIcon data-icon="inline-start" />
            Add District
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField
            label="Status"
            value={withDeleted ? "1" : "0"}
            onChange={(v) => setWithDeleted(v === "1")}
            options={[
              { value: "0", label: "Without Deleted" },
              { value: "1", label: "With Deleted" },
            ]}
          />
          <div className="flex flex-col justify-end">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, bangla name"
                aria-label="Search districts"
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
              <TableHead className="w-12">Sl</TableHead>
              {sortHead("name", "Name")}
              {sortHead("nameBn", "Bangla Name")}
              {sortHead("rank", "Rank")}
              <TableHead>User</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((district, index) => {
                const edited = district.createdAt !== district.modifiedAt
                const deleted = district.status === "Deleted"
                return (
                  <TableRow key={district.id} className={deleted ? "text-muted-foreground" : ""}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`${DISTRICTS_HREF}/${district.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {district.name}
                      </Link>
                    </TableCell>
                    <TableCell>{district.nameBn || "—"}</TableCell>
                    <TableCell className="tabular-nums">{deleted ? "—" : district.rank}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {edited ? (
                        <>
                          <div>Cr: {district.createdBy}</div>
                          <div>Mo: {district.modifiedBy}</div>
                        </>
                      ) : (
                        district.createdBy
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      {edited ? (
                        <>
                          <div>Cr: {stamp(district.createdAt)}</div>
                          <div>Mo: {stamp(district.modifiedAt)}</div>
                        </>
                      ) : (
                        stamp(district.createdAt)
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={district.status} />
                    </TableCell>
                    <TableCell>
                      <DistrictActions district={district} />
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No district found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

type Confirm = "delete" | "retrieve" | "permanent"

// Row menu of the legacy grid: deleted districts can only be viewed,
// retrieved or deleted for good.
function DistrictActions({ district }: { district: District }) {
  const user = useCurrentUser()
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)
  const [ranking, setRanking] = React.useState(false)
  const deleted = district.status === "Deleted"

  function toggleStatus() {
    toggleDistrictStatus(district.id, user.name)
    toast.success(district.status === "Active" ? "In-activated successfully" : "Activated successfully")
  }

  // Students keep pointing at a deleted district, so one they live in
  // can't be removed for good.
  function requestPermanentDelete() {
    const reason = studentsUsing(null, (student) => student.districtId === district.id)
    if (reason) {
      toast.error(`${district.name} can't be permanently deleted`, { description: reason })
      return
    }
    setConfirm("permanent")
  }

  const dialogs: Record<
    Confirm,
    { title: string; description: string; action: string; destructive?: boolean; run: () => void; done: string }
  > = {
    delete: {
      title: `Delete "${district.name}"?`,
      description:
        "The district is hidden from the lists and pickers and gives up its rank. You can retrieve it later from “With Deleted”.",
      action: "Delete",
      destructive: true,
      run: () => deleteDistrict(district.id, user.name),
      done: "Deleted successfully",
    },
    retrieve: {
      title: `Retrieve "${district.name}"?`,
      description: "The district comes back as active, last in rank.",
      action: "Retrieve",
      run: () => retrieveDistrict(district.id, user.name),
      done: "District retrieved successfully",
    },
    permanent: {
      title: `Permanently delete "${district.name}"?`,
      description: "The district is removed for good. This cannot be undone.",
      action: "Permanent Delete",
      destructive: true,
      run: () => deleteDistrictPermanently(district.id),
      done: "Permanently deleted",
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
            <Link href={`${DISTRICTS_HREF}/${district.id}`}>
              <EyeIcon />
              Details
            </Link>
          </DropdownMenuItem>
          {deleted ? (
            <DropdownMenuItem onSelect={() => setConfirm("retrieve")}>
              <ArchiveRestoreIcon />
              Retrieve
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem asChild>
                <Link href={`${DISTRICTS_HREF}/${district.id}/edit`}>
                  <PencilIcon />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRanking(true)}>
                <ArrowUpDownIcon />
                Rank
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={toggleStatus}>
                {district.status === "Active" ? <CircleMinusIcon /> : <CircleCheckIcon />}
                {district.status === "Active" ? "Inactive" : "Active"}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={deleted ? requestPermanentDelete : () => setConfirm("delete")}
          >
            <Trash2Icon />
            {deleted ? "Permanent Delete" : "Delete"}
          </DropdownMenuItem>
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
          {ranking && <RankForm district={district} onDone={() => setRanking(false)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

// The legacy rank modal: current / maximum rank and the new rank to move to.
function RankForm({ district, onDone }: { district: District; onDone: () => void }) {
  const user = useCurrentUser()
  const id = React.useId()
  const max = maxDistrictRank()
  const [value, setValue] = React.useState("")
  const [error, setError] = React.useState<string>()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const rank = Number(value)
    if (!value || !Number.isInteger(rank) || rank <= 0) {
      setError("Rank field can't be empty or zero.")
    } else if (rank > max) {
      setError("New rank can't be greater than max rank.")
    } else if (rank === district.rank) {
      setError("New and old rank cannot be same.")
    } else {
      setDistrictRank(district.id, rank, user.name)
      toast.success("Rank updated successfully")
      onDone()
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Update rank</DialogTitle>
        <DialogDescription>
          Current rank / maximum rank: {district.rank} / {max}. Districts in between move by one.
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
