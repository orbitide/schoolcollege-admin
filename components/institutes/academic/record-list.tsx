"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon } from "lucide-react"

import {
  isKindEnabled,
  visibleColumns,
  kindConfig,
  kindLabels,
  type AcademicKind,
} from "@/components/institutes/academic/kinds"
import { RecordActions } from "@/components/institutes/academic/record-actions"
import { StatusBadge } from "@/components/institutes/status-badge"
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

  if (!institute) return <NotFound />

  const enabled = isKindEnabled(kind, institute)
  const { singular, plural } = kindLabels(kind, institute)
  const base = `/institutes/${instituteId}/${config.segment}`
  const columns = visibleColumns(kind, institute)
  const ranked = config.ranked !== false
  const hasCurrent = config.fields.some((field) => field.current)
  const columnCount = columns.length + (ranked ? 4 : 3)

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
                          disabled={!config.store.canMove(record.id, "up")}
                          onClick={() => config.store.move(record.id, "up")}
                        >
                          <ArrowUpIcon />
                          <span className="sr-only">Move up</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          disabled={!config.store.canMove(record.id, "down")}
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
                      <RecordActions
                        kind={kind}
                        record={record}
                        singular={singular}
                        instituteName={institute.name}
                        editHref={`${base}/${record.id}/edit`}
                      />
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
