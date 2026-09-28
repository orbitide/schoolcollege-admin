"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, PencilIcon } from "lucide-react"

import { EDUCATION_BOARDS_HREF } from "@/components/online-admission/education-board-list"
import { StatusBadge } from "@/components/institutes/status-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useEducationBoard } from "@/lib/education-boards"

// Legacy EducationBoard/Details, deleted boards included.
export function EducationBoardDetail({ id }: { id: number }) {
  const board = useEducationBoard(id)

  if (!board) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">No education board found</h2>
        <p className="text-sm text-muted-foreground">It may have been removed.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={EDUCATION_BOARDS_HREF}>Back to education boards</Link>
        </Button>
      </div>
    )
  }

  const rows: [string, React.ReactNode][] = [
    ["Name", board.name],
    ["Create By", board.createdBy],
    ["Creation Date", new Date(board.createdAt).toLocaleString("en-GB")],
    ["Modify By", board.modifiedBy],
    ["Modification Date", new Date(board.modifiedAt).toLocaleString("en-GB")],
    ["Status", <StatusBadge key="status" status={board.status} />],
  ]

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={EDUCATION_BOARDS_HREF}>
            <ArrowLeftIcon data-icon="inline-start" />
            Education boards
          </Link>
        </Button>
        {board.status !== "Deleted" && (
          <Button asChild variant="outline" size="sm">
            <Link href={`${EDUCATION_BOARDS_HREF}/${board.id}/edit`}>
              <PencilIcon data-icon="inline-start" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      <Card className="max-w-3xl">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">{board.name}</CardTitle>
          <CardDescription>Education Board Details</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-y-3 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[10rem_1fr] gap-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
