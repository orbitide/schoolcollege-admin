"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  academicKinds,
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

export function RecordList({
  instituteId,
  kind,
}: {
  instituteId: number
  kind: AcademicKind
}) {
  const config = academicKinds[kind]
  const institute = useInstitute(instituteId)
  const records = config.store.useList(instituteId)
  const [deleting, setDeleting] = React.useState<EditableRecord | null>(null)

  if (!institute) return <NotFound />

  const enabled = Boolean(institute[config.toggle])
  const base = `/institutes/${instituteId}/${config.segment}`
  const singular = config.singular.toLowerCase()

  function toggleStatus(record: EditableRecord) {
    const next = record.status === "Active" ? "Inactive" : "Active"
    config.store.setStatus(record.id, next)
    toast.success(`${record.name} ${next === "Active" ? "activated" : "inactivated"}`)
  }

  function remove() {
    if (!deleting) return
    config.store.remove(deleting.id)
    toast.success(`${deleting.name} deleted`)
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/institutes/${instituteId}`}>
          <ArrowLeftIcon data-icon="inline-start" />
          {institute.name}
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {config.plural}
          </h2>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        {enabled && (
          <Button asChild>
            <Link href={`${base}/new`}>
              <PlusIcon data-icon="inline-start" />
              Add {singular}
            </Link>
          </Button>
        )}
      </div>

      {!enabled && (
        <Card>
          <CardHeader>
            <CardTitle>{config.plural} are turned off</CardTitle>
            <CardDescription>
              Turn on {config.plural.toLowerCase()} in the institute&apos;s
              academic settings to manage them here.
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
                <TableHead className="w-28">Rank</TableHead>
                <TableHead>Name</TableHead>
                {config.hasCodeAndAddress && (
                  <>
                    <TableHead>Code</TableHead>
                    <TableHead>Address</TableHead>
                  </>
                )}
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length ? (
                records.map((record, index) => (
                  <TableRow key={record.id}>
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
                    <TableCell className="font-medium">{record.name}</TableCell>
                    {config.hasCodeAndAddress && (
                      <>
                        <TableCell>{record.code || "—"}</TableCell>
                        <TableCell className="max-w-64 truncate text-muted-foreground">
                          {record.address || "—"}
                        </TableCell>
                      </>
                    )}
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
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem asChild>
                            <Link href={`${base}/${record.id}/edit`}>
                              <PencilIcon />
                              Edit
                            </Link>
                          </DropdownMenuItem>
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
                            onSelect={() => setDeleting(record)}
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
                    colSpan={config.hasCodeAndAddress ? 6 : 4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No {config.plural.toLowerCase()} yet.
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
              This removes the {singular} from {institute.name}. This cannot be
              undone.
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
