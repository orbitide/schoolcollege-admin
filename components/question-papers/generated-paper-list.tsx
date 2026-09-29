"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArchiveRestoreIcon,
  CircleCheckIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  RotateCcwIcon,
  Trash2Icon,
  WandSparklesIcon,
} from "lucide-react"
import { toast } from "sonner"

import { GENERATED_PAPERS_HREF } from "@/components/question-papers/generate-question"
import { SurfaceTabs } from "@/components/surface-tabs"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { subjectStore } from "@/lib/academic-store"
import { capabilitiesFor, type AccessSurface, type Capabilities } from "@/lib/access"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { questionTypes } from "@/lib/question-bank"
import {
  clearPaper,
  deletePaperPermanently,
  paperLines,
  retrievePaper,
  setPaperStatus,
  useGeneratedPapers,
  type GeneratedPaper,
  type PaperStatus,
} from "@/lib/question-papers"
import { useTermExams } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

export const GENERATED_PAPERS_RESOURCE = "generated-question"

const titles: Record<AccessSurface, string> = {
  Admin: "Manage Generated Question (Admin)",
  Manage: "Manage Generated Question",
  View: "View Generated Question",
}

const statusTone: Record<PaperStatus, string> = {
  Draft: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Deleted: "border-destructive/40 text-destructive",
}

export function PaperStatusBadge({ status }: { status: PaperStatus }) {
  return (
    <Badge variant="outline" className={statusTone[status]}>
      {status}
    </Badge>
  )
}

// Term Exam › Manage Generated Question (legacy Manage Generate Question):
// every generated paper of the user's institutes. Manage opens, approves,
// reopens and clears them; Admin also sees cleared ones, retrieves or
// removes them; View only opens and prints.
export function GeneratedPaperList({ surface }: { surface: AccessSurface }) {
  const can = capabilitiesFor(surface, { resource: GENERATED_PAPERS_RESOURCE, softDelete: true })
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const papers = useGeneratedPapers()
  const exams = useTermExams()
  const subjects = subjectStore.useAll()
  const canPick = institutes.length > 1
  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick ? institutes.find((i) => String(i.id) === param("institute")) : institutes[0]
  const allowed = new Set(institutes.map((i) => i.id))
  const withDeleted = can.restore && param("deleted") === "1"
  const examName = new Map(exams.map((e) => [e.id, e.fullName]))
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]))
  const instituteExams = exams.filter((e) => e.status !== "Deleted" && (!institute || e.instituteId === institute.id) && allowed.has(e.instituteId))

  const rows = papers
    .filter(
      (p) =>
        allowed.has(p.instituteId) &&
        (!institute || p.instituteId === institute.id) &&
        (withDeleted || p.status !== "Deleted") &&
        (!param("exam") || String(p.termExamId) === param("exam")) &&
        (!param("type") || p.type === param("type"))
    )
    .sort((a, b) => Number(a.status === "Deleted") - Number(b.status === "Deleted") || b.modifiedAt.localeCompare(a.modifiedAt))

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{titles[surface]}</CardTitle>
            <CardDescription>Question papers generated from the bank, with their sets. Approve a paper before printing it.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SurfaceTabs resource={GENERATED_PAPERS_RESOURCE} baseUrl={GENERATED_PAPERS_HREF} current={surface} />
            {can.create && (
              <Button asChild size="sm">
                <Link href="/term-exam/generate-question">
                  <WandSparklesIcon data-icon="inline-start" />
                  Generate Question
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canPick && (
            <FilterField
              label="Institute"
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v, exam: "" })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              allLabel="All Institute"
            />
          )}
          <FilterField
            label="Term exam"
            value={param("exam")}
            onChange={(v) => setParam({ exam: v })}
            options={instituteExams.map((e) => ({ value: String(e.id), label: e.fullName }))}
            allLabel="All exams"
          />
          <FilterField
            label="Type"
            value={param("type")}
            onChange={(v) => setParam({ type: v })}
            options={questionTypes.map((t) => ({ value: t, label: t }))}
            allLabel="MCQ and CQ"
          />
          {can.restore && (
            <FilterField
              label="Status"
              value={withDeleted ? "1" : "0"}
              onChange={(v) => setParam({ deleted: v === "1" ? "1" : "" })}
              options={[
                { value: "0", label: "Without Cleared" },
                { value: "1", label: "With Cleared" },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12">Sl</TableHead>
              <TableHead>Exam</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Questions</TableHead>
              <TableHead>Sets</TableHead>
              <TableHead>Language</TableHead>
              <TableHead className="text-right">Replaced</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((paper, index) => (
                <TableRow key={paper.id} className={cn(paper.status === "Deleted" && "text-muted-foreground")}>
                  <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <Link
                      href={`${GENERATED_PAPERS_HREF}/${paper.id}?returnTo=${encodeURIComponent(returnTo)}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {examName.get(paper.termExamId) ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell>{subjectName.get(paper.subjectId) ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{paper.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{paper.sets[0] ? paperLines(paper, paper.sets[0]).length : 0}</TableCell>
                  <TableCell>{paper.sets.map((s) => s.setCode).join(", ")}</TableCell>
                  <TableCell className="text-xs">
                    {[paper.settings.bangla && "বাংলা", paper.settings.english && "English"].filter(Boolean).join(" · ")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{paper.replacements.length || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {paper.modifiedBy}
                    <span className="block text-muted-foreground tabular-nums">{stamp(paper.modifiedAt)}</span>
                  </TableCell>
                  <TableCell>
                    <PaperStatusBadge status={paper.status} />
                  </TableCell>
                  <TableCell>
                    <PaperActions paper={paper} can={can} returnTo={returnTo} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                  No generated question yet.{" "}
                  {can.create && (
                    <Link href="/term-exam/generate-question" className="font-medium text-foreground underline underline-offset-4">
                      Generate one
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

type Confirm = "clear" | "retrieve" | "permanent"

// Row menu (and the paper page's menu): open, approve or reopen, clear; a
// cleared paper can be retrieved or removed for good.
export function PaperActions({
  paper,
  can,
  returnTo,
  onDetail,
}: {
  paper: GeneratedPaper
  can: Capabilities
  returnTo: string
  onDetail?: boolean
}) {
  const user = useCurrentUser()
  const router = useRouter()
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)
  const deleted = paper.status === "Deleted"
  const keys = paper.type === "MCQ" ? " Its answer keys are removed from Manage Correct Answer." : ""

  const dialogs: Record<Confirm, { title: string; description: string; action: string; destructive?: boolean; run: () => void; done: string }> = {
    clear: {
      title: "Clear this generated question?",
      description: `The paper and its sets are deleted.${keys} An admin can retrieve it.`,
      action: "Clear",
      destructive: true,
      run: () => {
        clearPaper(paper.id, user.name)
        if (onDetail) router.push(returnTo)
      },
      done: "Generated question cleared",
    },
    retrieve: {
      title: "Retrieve this generated question?",
      description: `It comes back as a draft${paper.type === "MCQ" ? ", and its answer keys are written again" : ""}.`,
      action: "Retrieve",
      run: () => retrievePaper(paper.id, user.name),
      done: "Generated question retrieved",
    },
    permanent: {
      title: "Permanently delete this generated question?",
      description: "It is removed for good. This cannot be undone.",
      action: "Permanent Delete",
      destructive: true,
      run: () => {
        deletePaperPermanently(paper.id)
        if (onDetail) router.push(returnTo)
      },
      done: "Generated question deleted",
    },
  }
  const dialog = confirm ? dialogs[confirm] : null

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
          {!onDetail && (
            <DropdownMenuItem asChild>
              <Link href={`${GENERATED_PAPERS_HREF}/${paper.id}?returnTo=${encodeURIComponent(returnTo)}`}>
                <EyeIcon />
                Open
              </Link>
            </DropdownMenuItem>
          )}
          {!deleted && can.status && paper.status === "Draft" && (
            <DropdownMenuItem
              onSelect={() => {
                setPaperStatus(paper.id, "Approved", user.name)
                toast.success("Paper approved")
              }}
            >
              <CircleCheckIcon />
              Approve
            </DropdownMenuItem>
          )}
          {!deleted && can.status && paper.status === "Approved" && (
            <DropdownMenuItem
              onSelect={() => {
                setPaperStatus(paper.id, "Draft", user.name)
                toast.success("Paper reopened as a draft")
              }}
            >
              <RotateCcwIcon />
              Reopen
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
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(deleted ? "permanent" : "clear")}>
                <Trash2Icon />
                {deleted ? "Permanent Delete" : "Clear"}
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
                  try {
                    dialog.run()
                    toast.success(dialog.done)
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "That didn't work.")
                  }
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
