"use client"

import * as React from "react"
import Link from "next/link"
import { PencilIcon } from "lucide-react"

import { QuestionActions } from "@/components/questions/question-actions"
import { QUESTIONS_HREF } from "@/components/questions/question-form"
import { questionLabel, QUESTIONS_RESOURCE } from "@/components/questions/question-list"
import { QuestionPreview } from "@/components/questions/question-preview"
import { QuestionStatusBadge } from "@/components/questions/question-status"
import { stamp } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { classStore, subjectStore } from "@/lib/academic-store"
import { capabilitiesFor, permissionCode, surfacesOf, useCan } from "@/lib/access"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { difficultyLabel, questionChapterStore, questionMarks, useQuestion } from "@/lib/question-bank"

// Question Bank › Question details: everything about the question, in each
// of its languages, with the row actions the user's best surface allows.
export function QuestionDetail({ id, returnTo }: { id: number; returnTo?: string }) {
  const question = useQuestion(id)
  const institutes = useAccessibleInstitutes()
  const can = useCan()
  const surface = surfacesOf(QUESTIONS_RESOURCE).find((s) => can(permissionCode(QUESTIONS_RESOURCE, s))) ?? "View"
  const caps = capabilitiesFor(surface, { resource: QUESTIONS_RESOURCE, softDelete: true })
  const listHref = returnTo?.startsWith("/") ? returnTo : QUESTIONS_HREF
  const classes = classStore.useAll()
  const subjects = subjectStore.useAll()
  const chapters = questionChapterStore.useAll()
  const [lang, setLang] = React.useState<"bn" | "en" | null>(null)
  const [solutions, setSolutions] = React.useState(true)

  const visible = question && institutes.some((i) => i.id === question.instituteId) && (question.status !== "Deleted" || caps.restore)
  if (!question || !visible) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Question not found</h2>
        <p className="text-sm text-muted-foreground">It may have been deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>Back to questions</Link>
        </Button>
      </div>
    )
  }

  const languages = (["bn", "en"] as const).filter((l) => (l === "bn" ? question.bangla : question.english))
  const shown = lang && languages.includes(lang) ? lang : languages[0]
  const name = (list: { id: number; name: string }[], rid: number | null) => (rid == null ? "—" : (list.find((x) => x.id === rid)?.name ?? "—"))
  const back = `${QUESTIONS_HREF}/${question.id}?returnTo=${encodeURIComponent(listHref)}`

  const facts: [string, React.ReactNode][] = [
    ["Class", name(classes, question.classId)],
    ["Subject", name(subjects, question.subjectId)],
    ["Chapter", name(chapters, question.chapterId)],
    ["Topic", name(chapters, question.topicId)],
    ["Type", `${question.type}${question.type === "MCQ" && question.items.length > 1 ? ` · ${question.items.length} questions under a stimulus` : ""}`],
    ["Marks", question.type === "CQ" ? questionMarks(question) : "Set per paper"],
    ["Level", question.level],
    ["Difficulty", `${question.difficulty} · ${difficultyLabel(question.difficulty)}`],
    ["Created", `${question.createdBy} · ${stamp(question.createdAt)}`],
    ["Modified", `${question.modifiedBy} · ${stamp(question.modifiedAt)}`],
  ]

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card className="max-w-5xl">
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
              Question #{question.id}
              <QuestionStatusBadge status={question.status} />
            </CardTitle>
            <CardDescription>{questionLabel(question, 120)}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={listHref}>Back</Link>
            </Button>
            {caps.edit && question.status !== "Deleted" && (
              <Button asChild size="sm">
                <Link href={`${QUESTIONS_HREF}/${question.id}/edit?returnTo=${encodeURIComponent(back)}`}>
                  <PencilIcon data-icon="inline-start" />
                  Edit
                </Link>
              </Button>
            )}
            <QuestionActions question={question} returnTo={listHref} can={caps} label={questionLabel(question, 50)} />
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
            {facts.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card className="max-w-5xl">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 border-b">
          <CardTitle className="text-base">Question</CardTitle>
          <div className="flex flex-wrap items-center gap-4">
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox checked={solutions} onCheckedChange={(on) => setSolutions(on === true)} />
              Show solutions
            </Label>
            {languages.length > 1 && (
              <Tabs value={shown} onValueChange={(v) => setLang(v as "bn" | "en")}>
                <TabsList>
                  <TabsTrigger value="bn">বাংলা</TabsTrigger>
                  <TabsTrigger value="en">English</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
        </CardHeader>
        <CardContent>{shown && <QuestionPreview question={question} lang={shown} showSolution={solutions} />}</CardContent>
      </Card>
    </div>
  )
}
