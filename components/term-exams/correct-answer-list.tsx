"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { EllipsisVerticalIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { useStudentLookups } from "@/components/students/student-lookups"
import { SurfaceTabs } from "@/components/surface-tabs"
import { FilterField } from "@/components/term-exams/term-exam-fields"
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
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { classStore, groupStore } from "@/lib/academic-store"
import { capabilitiesFor, type AccessSurface } from "@/lib/access"
import { useAccessibleInstitutes } from "@/lib/current-user"
import {
  deleteAnswerKey,
  mcqSubjects,
  useTermExamAnswers,
  type TermExamAnswer,
} from "@/lib/term-exam-answers"
import { useTermExams } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

export const correctAnswersHref = "/term-exam/correct-answers"

const titles: Record<"Admin" | "Manage", string> = {
  Admin: "Correct Answer Manage for Term Exam (Admin)",
  Manage: "Correct Answer Manage for Term Exam",
}

// Legacy TermExamSubjectCorrectAnswer/ManageAdmin and Manage (there is no
// ManageView): the MCQ answer keys of every institute's term exams, narrowed
// by class, exam and subject. Both add and edit keys; only Admin deletes.
export function CorrectAnswerList({ surface }: { surface: Exclude<AccessSurface, "View"> }) {
  const can = capabilitiesFor(surface)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const exams = useTermExams()
  const answers = useTermExamAnswers()
  const name = useStudentLookups()
  const canPick = institutes.length > 1

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const groups = groupStore.useList(iid)

  const selectedClass = classes.find((c) => String(c.id) === param("class"))
  const classGroups =
    institute?.enableGroup && selectedClass?.hasSubjectGroup
      ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
      : []
  const classExams = exams.filter(
    (e) =>
      e.status !== "Deleted" &&
      e.instituteId === iid &&
      String(e.classId) === param("class") &&
      (!param("group") || e.groupId == null || String(e.groupId) === param("group"))
  )
  const selectedExam = classExams.find((e) => String(e.id) === param("exam"))

  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()
  const allowed = new Set(institutes.map((i) => i.id))
  const examById = new Map(exams.map((e) => [e.id, e]))
  const rows = answers
    .map((answer) => ({ answer, exam: examById.get(answer.termExamId) }))
    .filter(
      (row): row is { answer: TermExamAnswer; exam: NonNullable<typeof row.exam> } =>
        !!row.exam &&
        allowed.has(row.exam.instituteId) &&
        (!institute || row.exam.instituteId === institute.id) &&
        (!param("class") || String(row.exam.classId) === param("class")) &&
        (!param("group") || row.exam.groupId == null || String(row.exam.groupId) === param("group")) &&
        (!param("exam") || String(row.exam.id) === param("exam")) &&
        (!param("subject") || String(row.answer.subjectId) === param("subject")) &&
        (!needle || row.answer.setCode.toLowerCase().includes(needle))
    )
    .sort(
      (a, b) =>
        a.exam.instituteId - b.exam.instituteId ||
        a.exam.rank - b.exam.rank ||
        a.answer.subjectId - b.answer.subjectId ||
        a.answer.setCode.localeCompare(b.answer.setCode)
    )

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
  const newHref = `${correctAnswersHref}/new?${new URLSearchParams({
    ...(institute && { institute: String(institute.id) }),
    ...(param("class") && { class: param("class") }),
    ...(param("exam") && { exam: param("exam") }),
    returnTo,
  })}`
  const instituteName = new Map(institutes.map((i) => [i.id, i.shortName || i.name]))
  const showInstitute = !institute
  const columnCount = 8 + (showInstitute ? 1 : 0)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{titles[surface]}</CardTitle>
            <CardDescription>
              The MCQ answer key of each term exam subject and question set, used to mark OMR
              sheets.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SurfaceTabs resource="correct-answer" baseUrl={correctAnswersHref} current={surface} />
            {can.create && (
              <Button asChild size="sm">
                <Link href={newHref}>
                  <PlusIcon data-icon="inline-start" />
                  Add correct answer
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
              onChange={(v) => setParam({ institute: v, class: "", group: "", exam: "", subject: "" })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              allLabel="All institutes"
            />
          )}
          {institute && (
            <FilterField
              label="Class"
              value={param("class")}
              onChange={(v) => setParam({ class: v, group: "", exam: "", subject: "" })}
              options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
              allLabel="All classes"
            />
          )}
          {classGroups.length > 0 && (
            <FilterField
              label="Academic group"
              value={param("group")}
              onChange={(v) => setParam({ group: v, exam: "", subject: "" })}
              options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
              allLabel="All groups"
            />
          )}
          {selectedClass && (
            <FilterField
              label="Term exam"
              value={param("exam")}
              onChange={(v) => setParam({ exam: v, subject: "" })}
              options={classExams.map((e) => ({ value: String(e.id), label: e.fullName }))}
              allLabel="All term exams"
            />
          )}
          {selectedExam && (
            <FilterField
              label="Subject"
              value={param("subject")}
              onChange={(v) => setParam({ subject: v })}
              options={mcqSubjects(selectedExam).map((s) => ({
                value: String(s.subjectId),
                label: name("subject", s.subjectId),
              }))}
              allLabel="All subjects"
            />
          )}
          <div className="flex flex-col justify-end">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by set code"
                aria-label="Search by set code"
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
              {showInstitute && <TableHead>Institute</TableHead>}
              <TableHead>Class</TableHead>
              <TableHead>Exam</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="text-center">Set code</TableHead>
              <TableHead>Answer</TableHead>
              <TableHead>Modified</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map(({ answer, exam }, index) => (
                <TableRow key={answer.id}>
                  <TableCell className="align-top tabular-nums text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  {showInstitute && (
                    <TableCell className="align-top">
                      {instituteName.get(exam.instituteId) ?? "—"}
                    </TableCell>
                  )}
                  <TableCell className="align-top whitespace-nowrap">
                    {name("class", exam.classId)}
                  </TableCell>
                  <TableCell className="align-top whitespace-nowrap">{exam.fullName}</TableCell>
                  <TableCell className="align-top whitespace-nowrap">
                    {name("subject", answer.subjectId)}
                  </TableCell>
                  <TableCell className="text-center align-top">
                    <span className="inline-flex min-w-7 justify-center rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary">
                      {answer.setCode}
                    </span>
                  </TableCell>
                  <TableCell className="align-top">
                    <AnswerChips answer={answer.answer} />
                  </TableCell>
                  <TableCell className="align-top text-xs whitespace-nowrap">
                    <div>{answer.modifiedBy}</div>
                    <div className="text-muted-foreground tabular-nums">{stamp(answer.modifiedAt)}</div>
                  </TableCell>
                  <TableCell className="align-top">
                    <AnswerActions
                      answer={answer}
                      label={`${name("subject", answer.subjectId)} set ${answer.setCode}`}
                      returnTo={returnTo}
                      canDelete={can.delete}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                  No correct answers match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

const specialChip: Record<string, { className: string; title: string }> = {
  "+": {
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    title: "Plus marks",
  },
  "-": { className: "bg-rose-500/15 text-rose-700 dark:text-rose-300", title: "Minus marks" },
  $: {
    className: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    title: "If answered any, give marks",
  },
}

// The key as numbered chips; the special marks stand out in colour.
function AnswerChips({ answer }: { answer: string }) {
  const parts = answer.split(",")
  return (
    <div className="flex max-w-xl flex-wrap gap-1">
      {parts.map((part, index) => {
        const special = specialChip[part]
        return (
          <span
            key={index}
            title={`Q${index + 1}: ${special?.title ?? part}`}
            className={cn(
              "inline-flex h-6 min-w-6 items-center justify-center gap-0.5 rounded bg-muted px-1 font-mono text-xs",
              special?.className
            )}
          >
            <span className="text-[9px] text-muted-foreground">{index + 1}</span>
            <span className="font-semibold">{part || "·"}</span>
          </span>
        )
      })}
    </div>
  )
}

function AnswerActions({
  answer,
  label,
  returnTo,
  canDelete,
}: {
  answer: TermExamAnswer
  label: string
  returnTo: string
  canDelete: boolean
}) {
  const [confirming, setConfirming] = React.useState(false)
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
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem asChild>
            <Link href={`${correctAnswersHref}/${answer.id}/edit?returnTo=${encodeURIComponent(returnTo)}`}>
              <PencilIcon />
              Edit
            </Link>
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirming(true)}>
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete the correct answer for {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              OMR sheets of this set can&apos;t be marked until a new answer key is added. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                deleteAnswerKey(answer.id)
                toast.success(`Correct answer for ${label} deleted`)
                setConfirming(false)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function stamp(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}
