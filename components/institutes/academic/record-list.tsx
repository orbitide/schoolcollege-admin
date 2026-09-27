"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarCheckIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  isKindEnabled,
  visibleColumns,
  kindConfig,
  kindLabels,
  type AcademicKind,
  type EditableRecord,
} from "@/components/institutes/academic/kinds"
import { StatusBadge } from "@/components/institutes/status-badge"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useInstitute } from "@/lib/institutes-store"
import { cn } from "@/lib/utils"

export function RecordList({
  instituteId,
  kind,
}: {
  instituteId: number
  kind: AcademicKind
}) {
  const config = kindConfig(kind)
  const institute = useInstitute(instituteId)
  const records = config.store.useList(instituteId)
  const [deleting, setDeleting] = React.useState<EditableRecord | null>(null)

  if (!institute) return <NotFound />

  const enabled = isKindEnabled(kind, institute)
  const { singular, plural } = kindLabels(kind, institute)
  const base = `/institutes/${instituteId}/${config.segment}`
  const columns = visibleColumns(kind, institute)
  const ranked = config.ranked !== false
  const hasCurrent = config.fields.some((field) => field.current)
  const columnCount = columns.length + (ranked ? 4 : 3)

  function toggleStatus(record: EditableRecord) {
    const next = record.status === "Active" ? "Inactive" : "Active"
    config.store.setStatus(record.id, next)
    toast.success(`${record.name} ${next === "Active" ? "activated" : "inactivated"}`)
  }

  function makeCurrent(record: EditableRecord) {
    config.store.setCurrent(record.id)
    toast.success(`${record.name} is now the current ${singular.toLowerCase()}`)
  }

  // Records other records still point at can't be deleted yet.
  function requestDelete(record: EditableRecord) {
    const reason = config.inUse?.(record)
    if (reason) {
      toast.error(`${record.name} can't be deleted`, {
        description: `${reason} Move or delete those first, or inactivate it instead.`,
      })
      return
    }
    setDeleting(record)
  }

  function remove() {
    if (!deleting) return
    config.store.remove(deleting.id)
    toast.success(`${deleting.name} deleted`)
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">{plural}</h3>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        {enabled && (
          <Button asChild>
            <Link href={`${base}/new`}>
              <PlusIcon data-icon="inline-start" />
              Add {singular.toLowerCase()}
            </Link>
          </Button>
        )}
      </div>

      {!enabled && (
        <Card>
          <CardHeader>
            <CardTitle>{plural} are turned off</CardTitle>
            <CardDescription>
              Turn on {plural.toLowerCase()} in the institute&apos;s academic
              settings to manage them here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href={`/institutes/${instituteId}/edit`}>
                <PencilIcon data-icon="inline-start" />
                Edit institute
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {enabled && (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                {ranked && <TableHead className="w-28">Rank</TableHead>}
                <TableHead>Name</TableHead>
                {columns.map((column) => (
                  <TableHead
                    key={column.label}
                    className={cn(column.align === "right" && "text-right")}
                  >
                    {column.label}
                  </TableHead>
                ))}
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length ? (
                records.map((record, index) => (
                  <TableRow key={record.id}>
                    {ranked && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="w-6 tabular-nums text-muted-foreground">
                          {index + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          disabled={index === 0}
                          onClick={() => config.store.move(record.id, "up")}
                        >
                          <ArrowUpIcon />
                          <span className="sr-only">Move up</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          disabled={index === records.length - 1}
                          onClick={() => config.store.move(record.id, "down")}
                        >
                          <ArrowDownIcon />
                          <span className="sr-only">Move down</span>
                        </Button>
                      </div>
                    </TableCell>
                    )}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {record.name}
                        {hasCurrent && Boolean(record.isCurrent) && (
                          <Badge>Current</Badge>
                        )}
                      </div>
                    </TableCell>
                    {columns.map((column) => (
                      <TableCell
                        key={column.label}
                        className={cn(
                          column.align === "right" && "text-right tabular-nums"
                        )}
                      >
                        {column.render(record)}
                      </TableCell>
                    ))}
                    <TableCell>
                      <StatusBadge status={record.status} />
                    </TableCell>
                    <TableCell>
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
                            <Link href={`${base}/${record.id}/edit`}>
                              <PencilIcon />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          {hasCurrent && !record.isCurrent && (
                            <DropdownMenuItem onSelect={() => makeCurrent(record)}>
                              <CalendarCheckIcon />
                              Set as current
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => toggleStatus(record)}>
                            {record.status === "Active" ? (
                              <CircleMinusIcon />
                            ) : (
                              <CircleCheckIcon />
                            )}
                            {record.status === "Active" ? "Inactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => requestDelete(record)}
                          >
                            <Trash2Icon />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columnCount}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No {plural.toLowerCase()} yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the {singular.toLowerCase()} from {institute.name}.
              This cannot be undone.
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
    </div>
  )
}

export function NotFound({ what = "Institute" }: { what?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h2 className="text-xl font-semibold">{what} not found</h2>
      <p className="text-sm text-muted-foreground">It may have been deleted.</p>
      <Button asChild variant="outline" size="sm">
        <Link href="/institutes">Back to institutes</Link>
      </Button>
    </div>
  )
}
