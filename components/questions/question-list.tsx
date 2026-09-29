"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { PlusIcon, SearchIcon, SigmaIcon } from "lucide-react"

import { QuestionActions, questionHref } from "@/components/questions/question-actions"
import { QUESTIONS_HREF } from "@/components/questions/question-form"
import { QuestionStatusBadge } from "@/components/questions/question-status"
import { SurfaceTabs } from "@/components/surface-tabs"
import { FilterField, stamp } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { classStore, subjectStore } from "@/lib/academic-store"
import { capabilitiesFor, type AccessSurface } from "@/lib/access"
import { useAccessibleInstitutes } from "@/lib/current-user"
import {
  difficultyLabel,
  difficultyLevels,
  plainText,
  questionChapterStore,
  questionLevels,
  questionMarks,
  questionStatuses,
  questionTypes,
  useQuestions,
  type Question,
} from "@/lib/question-bank"
import { cn } from "@/lib/utils"

export const QUESTIONS_RESOURCE = "question"

const titles: Record<AccessSurface, string> = {
  Admin: "Manage Question (Admin)",
  Manage: "Manage Question",
  View: "View Question",
}

// A question's first line of text, for lists and dialogs.
export function questionLabel(q: Question, max = 90) {
  const html = q.hasUddipok ? q.uddipok.en || q.uddipok.bn : q.items[0]?.text.en || q.items[0]?.text.bn || ""
  const text = plainText(html)
  return text.length > max ? `${text.slice(0, max - 1)}…` : text || "(no text)"
}

// Question Bank › Manage Question (legacy Question Manage for Mcq and Theory
// & Cq in one list). Filtered by class, subject, chapter, type, level,
// difficulty and status, all kept in the URL. Manage adds, edits, approves,
// retires and deletes (soft); Admin also sees deleted ones, retrieves or
// removes them; View only reads.
export function QuestionList({ surface }: { surface: AccessSurface }) {
  const can = capabilitiesFor(surface, { resource: QUESTIONS_RESOURCE, softDelete: true })
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const questions = useQuestions()
  const canPick = institutes.length > 1
  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick ? institutes.find((i) => String(i.id) === param("institute")) : institutes[0]
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const subjects = subjectStore.useList(iid)
  const chapters = questionChapterStore.useAll()
  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()
  const allowed = new Set(institutes.map((i) => i.id))
  const status = param("status")
  const withDeleted = can.restore && status === "Deleted"

  const chapterName = new Map(chapters.map((c) => [c.id, c.name]))
  const className = new Map(classStore.useAll().map((c) => [c.id, c.name]))
  const subjectName = new Map(subjectStore.useAll().map((s) => [s.id, s.name]))
  const chapterOptions = chapters.filter(
    (c) =>
      c.instituteId === iid &&
      c.status !== "Deleted" &&
      c.parentId == null &&
      (!param("class") || String(c.classId) === param("class")) &&
      (!param("subject") || String(c.subjectId) === param("subject"))
  )
  const is = (value: number | string, key: string) => !param(key) || String(value) === param(key)

  const rows = questions
    .filter(
      (q) =>
        allowed.has(q.instituteId) &&
        (!institute || q.instituteId === institute.id) &&
        (status ? q.status === status && (status !== "Deleted" || withDeleted) : q.status !== "Deleted") &&
        is(q.classId, "class") &&
        is(q.subjectId, "subject") &&
        (!param("chapter") || String(q.chapterId) === param("chapter") || String(q.topicId) === param("chapter")) &&
        is(q.type, "type") &&
        is(q.level, "level") &&
        is(q.difficulty, "difficulty") &&
        (!needle || questionText(q).toLowerCase().includes(needle))
    )
    .sort((a, b) => a.classId - b.classId || a.subjectId - b.subjectId || a.chapterId - b.chapterId || b.id - a.id)

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
  const newHref = `${QUESTIONS_HREF}/new?${new URLSearchParams({
    ...(institute && { institute: String(institute.id) }),
    ...(param("class") && { class: param("class") }),
    ...(param("subject") && { subject: param("subject") }),
    ...(param("chapter") && { chapter: param("chapter") }),
    ...(param("type") && { type: param("type") }),
    returnTo,
  })}`
  const approved = rows.filter((q) => q.status === "Approved")
  const statusOptions = questionStatuses.filter((s) => s !== "Deleted" || can.restore)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{titles[surface]}</CardTitle>
            <CardDescription>
              MCQ and creative questions by class, subject and chapter. Only approved questions go into generated papers.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SurfaceTabs resource={QUESTIONS_RESOURCE} baseUrl={QUESTIONS_HREF} current={surface} />
            {can.create && institutes.length > 0 && (
              <Button asChild size="sm">
                <Link href={newHref}>
                  <PlusIcon data-icon="inline-start" />
                  Add Question
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
              onChange={(v) => setParam({ institute: v, class: "", subject: "", chapter: "" })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              allLabel="All Institute"
            />
          )}
          <FilterField
            label="Class"
            value={param("class")}
            onChange={(v) => setParam({ class: v, chapter: "" })}
            options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            allLabel="All classes"
            disabled={!institute}
          />
          <FilterField
            label="Subject"
            value={param("subject")}
            onChange={(v) => setParam({ subject: v, chapter: "" })}
            options={subjects.map((s) => ({ value: String(s.id), label: s.name }))}
            allLabel="All subjects"
            disabled={!institute}
          />
          <FilterField
            label="Chapter"
            value={param("chapter")}
            onChange={(v) => setParam({ chapter: v })}
            options={chapterOptions.map((c) => ({ value: String(c.id), label: c.name }))}
            allLabel="All chapters"
            disabled={!institute}
          />
          <FilterField
            label="Type"
            value={param("type")}
            onChange={(v) => setParam({ type: v })}
            options={questionTypes.map((t) => ({ value: t, label: t }))}
            allLabel="MCQ and CQ"
          />
          <FilterField
            label="Level"
            value={param("level")}
            onChange={(v) => setParam({ level: v })}
            options={questionLevels.map((l) => ({ value: l, label: l }))}
            allLabel="All levels"
          />
          <FilterField
            label="Difficulty"
            value={param("difficulty")}
            onChange={(v) => setParam({ difficulty: v })}
            options={difficultyLevels.map((d) => ({ value: String(d.value), label: `${d.value} · ${d.label}` }))}
            allLabel="Any difficulty"
          />
          <FilterField
            label="Status"
            value={status}
            onChange={(v) => setParam({ status: v })}
            options={statusOptions.map((s) => ({ value: s, label: s }))}
            allLabel="Any (not deleted)"
          />
          <div className="flex flex-col justify-end sm:col-span-2 lg:col-span-4">
            <div className="relative max-w-md">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search question text"
                aria-label="Search questions"
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {rows.length} question{rows.length === 1 ? "" : "s"} · {approved.length} approved
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12">Sl</TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Class · Subject</TableHead>
              <TableHead>Chapter</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((q, index) => (
                <TableRow key={q.id} className={cn(q.status === "Deleted" && "text-muted-foreground")}>
                  <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="max-w-96">
                    <Link href={questionHref(q.id, returnTo)} className="font-medium underline-offset-4 hover:underline">
                      {questionLabel(q)}
                    </Link>
                    {/data-latex=/.test(JSON.stringify(q.items)) && (
                      <SigmaIcon className="ml-1 inline size-3.5 text-muted-foreground" aria-label="Has equations" />
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant="outline">{q.type}</Badge>
                    {q.type === "MCQ" && q.items.length > 1 && (
                      <span className="ml-1 text-xs text-muted-foreground">×{q.items.length}</span>
                    )}
                    {q.type === "CQ" && <span className="ml-1 text-xs text-muted-foreground">{questionMarks(q)} marks</span>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {className.get(q.classId) ?? "—"}
                    <span className="block text-muted-foreground">{subjectName.get(q.subjectId) ?? "—"}</span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {chapterName.get(q.chapterId) ?? "—"}
                    {q.topicId != null && <span className="block text-muted-foreground">{chapterName.get(q.topicId) ?? "—"}</span>}
                  </TableCell>
                  <TableCell className="text-xs">{q.level}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {q.difficulty} · {difficultyLabel(q.difficulty)}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {[q.bangla && "বাংলা", q.english && "English"].filter(Boolean).join(" · ")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {q.modifiedBy}
                    <span className="block text-muted-foreground tabular-nums">{stamp(q.modifiedAt)}</span>
                  </TableCell>
                  <TableCell>
                    <QuestionStatusBadge status={q.status} />
                  </TableCell>
                  <TableCell>
                    <QuestionActions question={q} returnTo={returnTo} can={can} label={questionLabel(q, 50)} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                  No question matches these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function questionText(q: Question) {
  return plainText(
    [q.uddipok.bn, q.uddipok.en, ...q.items.flatMap((i) => [i.text.bn, i.text.en, ...i.options.flatMap((o) => [o.bn, o.en])])].join(" ")
  )
}
