"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArchiveRestoreIcon,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  deleteEducationBoard,
  isDuplicateEducationBoardName,
  retrieveEducationBoard,
  toggleEducationBoardStatus,
  useAllEducationBoards,
  type EducationBoard,
} from "@/lib/education-boards"

export const EDUCATION_BOARDS_HREF = "/online-admission/education-boards"

// Legacy EducationBoard/Manage (the generic base grid): every board in id
// order, Not Deleted unless "With Deleted" is picked.
export function EducationBoardList() {
  const all = useAllEducationBoards()
  const [withDeleted, setWithDeleted] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const needle = query.trim().toLowerCase()
  const rows = all.filter(
    (b) =>
      (withDeleted || b.status !== "Deleted") &&
      (!needle || b.name.toLowerCase().includes(needle))
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Education Board Manage</h2>
          <p className="text-sm text-muted-foreground">
            Manage existing education boards online admission students passed SSC under.
          </p>
        </div>
        <Button asChild>
          <Link href={`${EDUCATION_BOARDS_HREF}/new`}>
            <PlusIcon data-icon="inline-start" />
            Add New
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
              { value: "0", label: "Not Deleted" },
              { value: "1", label: "With Deleted" },
            ]}
          />
          <div className="flex flex-col justify-end">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name"
                aria-label="Search education boards"
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
              <TableHead>Name</TableHead>
              <TableHead>Create By</TableHead>
              <TableHead>Creation Date</TableHead>
              <TableHead>Modify By</TableHead>
              <TableHead>Modification Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((board, index) => (
                <TableRow
                  key={board.id}
                  className={board.status === "Deleted" ? "text-muted-foreground" : ""}
                >
                  <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <Link
                      href={`${EDUCATION_BOARDS_HREF}/${board.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {board.name}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{board.createdBy}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs tabular-nums">
                    {stamp(board.createdAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{board.modifiedBy}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs tabular-nums">
                    {stamp(board.modifiedAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={board.status} />
                  </TableCell>
                  <TableCell>
                    <EducationBoardActions board={board} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No education board found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

type Confirm = "delete" | "retrieve"

// Row menu of the legacy grid: a deleted board can only be viewed or
// retrieved.
function EducationBoardActions({ board }: { board: EducationBoard }) {
  const user = useCurrentUser()
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)
  const deleted = board.status === "Deleted"

  function toggleStatus() {
    toggleEducationBoardStatus(board.id, user.name)
    toast.success(board.status === "Active" ? "In-activated successfully" : "Activated successfully")
  }

  // Another board may have taken the name while this one was deleted.
  function requestRetrieve() {
    if (isDuplicateEducationBoardName(board.name, board.id)) {
      toast.error(`${board.name} can't be retrieved`, {
        description: "Another education board already has this name.",
      })
      return
    }
    setConfirm("retrieve")
  }

  const dialogs: Record<
    Confirm,
    { title: string; description: string; action: string; destructive?: boolean; run: () => void; done: string }
  > = {
    delete: {
      title: `Delete "${board.name}"?`,
      description:
        "The education board is hidden from the lists and pickers. You can retrieve it later from “With Deleted”.",
      action: "Delete",
      destructive: true,
      run: () => deleteEducationBoard(board.id, user.name),
      done: "Item deleted successfully",
    },
    retrieve: {
      title: `Retrieve "${board.name}"?`,
      description: "The education board comes back as active.",
      action: "Retrieve",
      run: () => retrieveEducationBoard(board.id, user.name),
      done: "Item retrieved successfully",
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
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`${EDUCATION_BOARDS_HREF}/${board.id}`}>
              <EyeIcon />
              Details
            </Link>
          </DropdownMenuItem>
          {deleted ? (
            <DropdownMenuItem onSelect={requestRetrieve}>
              <ArchiveRestoreIcon />
              Retrieve
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem asChild>
                <Link href={`${EDUCATION_BOARDS_HREF}/${board.id}/edit`}>
                  <PencilIcon />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={toggleStatus}>
                {board.status === "Active" ? <CircleMinusIcon /> : <CircleCheckIcon />}
                {board.status === "Active" ? "Inactive" : "Active"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("delete")}>
                <Trash2Icon />
                Delete
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
    </>
  )
}
