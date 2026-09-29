"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { QuestionEditor } from "@/components/questions/question-editor"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { classStore, subjectStore } from "@/lib/academic-store"
import { cqLabels, optionLabels } from "@/lib/bangla"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import {
  addQuestion,
  blankItem,
  difficultyLevels,
  emptyBilingual,
  MAX_CQ_ITEMS,
  MAX_MCQ_GROUP,
  MCQ_OPTIONS,
  questionChapterStore,
  questionErrors,
  questionLevels,
  questionMarks,
  questionTypes,
  updateQuestion,
  useQuestion,
  type Bilingual,
  type QuestionErrors,
  type QuestionInput,
  type QuestionItem,
  type QuestionStatus,
  type QuestionType,
} from "@/lib/question-bank"
import { cn } from "@/lib/utils"

export const QUESTIONS_HREF = "/questions"

type Lang = "bn" | "en"
const languageLabel: Record<Lang, string> = { bn: "বাংলা", en: "English" }

// Question Bank › Add / Edit Question (legacy Create / Edit for Mcq and
// Theory & Cq). The question is written in Bangla, English or both; the tabs
// switch which language is being typed. A new question is saved as a draft,
// or approved straight away for the generator.
export function QuestionForm({
  id,
  initial,
  returnTo,
}: {
  id?: number
  initial?: { instituteId?: number; classId?: number; subjectId?: number; chapterId?: number; type?: QuestionType }
  returnTo?: string
}) {
  const router = useRouter()
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const question = useQuestion(id ?? -1)
  const isNew = id == null
  const listHref = returnTo?.startsWith("/") ? returnTo : QUESTIONS_HREF
  const fixed = institutes.length === 1 ? institutes[0].id : undefined

  const blank = (keep?: Partial<QuestionInput>): QuestionInput => {
    const type = keep?.type ?? initial?.type ?? "MCQ"
    return {
      instituteId: fixed ?? institutes.find((i) => i.id === initial?.instituteId)?.id ?? 0,
      classId: initial?.classId ?? 0,
      subjectId: initial?.subjectId ?? 0,
      chapterId: initial?.chapterId ?? 0,
      topicId: null,
      difficulty: 3,
      level: "Knowledge",
      bangla: true,
      english: false,
      ...keep,
      type,
      hasUddipok: type === "CQ",
      uddipok: emptyBilingual(),
      shuffleItems: false,
      items: type === "CQ" ? [0, 1, 2, 3].map((i) => blankItem("CQ", i)) : [blankItem("MCQ")],
    }
  }
  const [form, setForm] = React.useState<QuestionInput>(() => (question ? structuredClone(question) : blank()))
  const [errors, setErrors] = React.useState<QuestionErrors>({})
  const [lang, setLang] = React.useState<Lang>(form.bangla ? "bn" : "en")
  // Remounts the editors when a new blank form replaces the old one.
  const [version, setVersion] = React.useState(0)

  const iid = form.instituteId || -1
  const classes = classStore.useList(iid)
  const subjects = subjectStore.useList(iid)
  const chapters = questionChapterStore.useList(iid)
  const subjectChapters = chapters.filter((c) => c.classId === form.classId && c.subjectId === form.subjectId)
  const topics = subjectChapters.filter((c) => c.parentId === form.chapterId && form.chapterId)

  if (!isNew && (!question || question.status === "Deleted")) {
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

  const languages = (["bn", "en"] as const).filter((l) => (l === "bn" ? form.bangla : form.english))
  const shown: Lang = languages.includes(lang) ? lang : (languages[0] ?? "bn")

  function set(changes: Partial<QuestionInput>, ...cleared: string[]) {
    setForm((f) => ({ ...f, ...changes }))
    if (cleared.length) setErrors((e) => ({ ...e, ...Object.fromEntries(cleared.map((k) => [k, undefined])) }))
  }

  function setItem(index: number, changes: Partial<QuestionItem>, ...cleared: string[]) {
    setForm((f) => ({ ...f, items: f.items.map((item, i) => (i === index ? { ...item, ...changes } : item)) }))
    if (cleared.length) setErrors((e) => ({ ...e, ...Object.fromEntries(cleared.map((k) => [`items.${index}.${k}`, undefined])) }))
  }

  const text = (b: Bilingual, html: string): Bilingual => ({ ...b, [shown]: html })

  function changeType(type: QuestionType) {
    if (type === form.type) return
    setForm((f) => ({
      ...f,
      type,
      hasUddipok: type === "CQ" || f.hasUddipok,
      shuffleItems: false,
      items: type === "CQ" ? [0, 1, 2, 3].map((i) => blankItem("CQ", i)) : [blankItem("MCQ")],
    }))
    setErrors({})
    setVersion((v) => v + 1)
  }

  function save(status: QuestionStatus | undefined, andNew = false) {
    const next = questionErrors(form)
    setErrors(next)
    const first = Object.entries(next).find(([, v]) => v)
    if (first) {
      toast.error(first[1])
      return
    }
    if (isNew) {
      addQuestion(form, user.name, status ?? "Draft")
      toast.success(status === "Approved" ? "Question added and approved" : "Question added as a draft")
    } else {
      updateQuestion(id, form, user.name)
      toast.success("Question updated successfully")
    }
    if (andNew) {
      const keep = {
        instituteId: form.instituteId,
        classId: form.classId,
        subjectId: form.subjectId,
        chapterId: form.chapterId,
        topicId: form.topicId,
        difficulty: form.difficulty,
        level: form.level,
        bangla: form.bangla,
        english: form.english,
        type: form.type,
      }
      setForm(blank(keep))
      setErrors({})
      setVersion((v) => v + 1)
    } else {
      router.push(listHref)
    }
  }

  const labels = shown === "bn" ? cqLabels.bn : cqLabels.en
  const maxItems = form.type === "CQ" ? MAX_CQ_ITEMS : form.hasUddipok ? MAX_MCQ_GROUP : 1

  return (
    <form
      noValidate
      className="flex flex-col gap-4 px-4 py-4 md:py-6 lg:px-6"
      onSubmit={(e) => {
        e.preventDefault()
        save(undefined)
      }}
    >
      <Card className="max-w-5xl">
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{isNew ? "Add Question" : "Edit Question"}</CardTitle>
            <CardDescription>
              {isNew
                ? "Save it as a draft for review, or approve it for question papers now."
                : `Status: ${question?.status}. Papers already generated keep their own copy.`}
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={listHref}>Manage question</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {fixed == null && (
            <FilterField
              label="Institute"
              required
              value={form.instituteId ? String(form.instituteId) : ""}
              onChange={(v) => set({ instituteId: Number(v), classId: 0, subjectId: 0, chapterId: 0, topicId: null }, "instituteId")}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select an institute"
              error={errors.instituteId}
            />
          )}
          <FilterField
            label="Class"
            required
            value={form.classId ? String(form.classId) : ""}
            onChange={(v) => set({ classId: Number(v), chapterId: 0, topicId: null }, "classId")}
            options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder="Select class"
            error={errors.classId}
            disabled={!form.instituteId}
          />
          <FilterField
            label="Subject"
            required
            value={form.subjectId ? String(form.subjectId) : ""}
            onChange={(v) => set({ subjectId: Number(v), chapterId: 0, topicId: null }, "subjectId")}
            options={subjects.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="Select subject"
            error={errors.subjectId}
            disabled={!form.instituteId}
          />
          <FilterField
            label="Chapter"
            required
            value={form.chapterId ? String(form.chapterId) : ""}
            onChange={(v) => set({ chapterId: Number(v), topicId: null }, "chapterId")}
            options={subjectChapters.filter((c) => c.parentId == null).map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder={form.classId && form.subjectId && !subjectChapters.length ? "No chapter yet" : "Select chapter"}
            error={errors.chapterId}
            disabled={!form.classId || !form.subjectId}
          />
          <FilterField
            label="Topic"
            value={form.topicId ? String(form.topicId) : ""}
            onChange={(v) => set({ topicId: v ? Number(v) : null })}
            options={topics.map((c) => ({ value: String(c.id), label: c.name }))}
            allLabel="No topic"
            disabled={!topics.length}
          />
          <FilterField
            label="Type"
            required
            value={form.type}
            onChange={(v) => changeType(v as QuestionType)}
            options={questionTypes.map((t) => ({ value: t, label: t === "CQ" ? "CQ (creative)" : "MCQ" }))}
            disabled={!isNew}
          />
          <FilterField
            label="Difficulty"
            required
            value={String(form.difficulty)}
            onChange={(v) => set({ difficulty: Number(v) })}
            options={difficultyLevels.map((d) => ({ value: String(d.value), label: `${d.value} · ${d.label}` }))}
          />
          <FilterField
            label="Question level"
            required
            value={form.level}
            onChange={(v) => set({ level: v as QuestionInput["level"] })}
            options={questionLevels.map((l) => ({ value: l, label: l }))}
          />
          <fieldset className="flex flex-col gap-2 sm:col-span-2">
            <legend className="mb-2 text-sm font-medium">
              Language<span className="text-destructive">*</span>
            </legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Label className="flex items-center gap-2 font-normal">
                <Checkbox checked={form.bangla} onCheckedChange={(on) => set({ bangla: on === true }, "languages")} />
                Bangla
              </Label>
              <Label className="flex items-center gap-2 font-normal">
                <Checkbox checked={form.english} onCheckedChange={(on) => set({ english: on === true }, "languages")} />
                English
              </Label>
            </div>
            {errors.languages && <p className="text-sm text-destructive">{errors.languages}</p>}
          </fieldset>
          {form.type === "MCQ" && (
            <Label className="flex items-center gap-2 self-end font-normal sm:col-span-2">
              <Checkbox
                checked={form.hasUddipok}
                onCheckedChange={(on) =>
                  set({ hasUddipok: on === true, items: on === true ? form.items : form.items.slice(0, 1) }, "hasUddipok", "uddipok", "items")
                }
              />
              A stimulus with several questions under it
            </Label>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-5xl">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">{form.type === "CQ" ? "Creative question" : form.hasUddipok ? "Stimulus and questions" : "Question"}</CardTitle>
            <CardDescription>
              Σ adds an equation (LaTeX); paste or drop images straight in.
              {form.type === "CQ" && ` Total ${questionMarks(form)} marks.`}
            </CardDescription>
          </div>
          {languages.length > 1 && (
            <Tabs value={shown} onValueChange={(v) => setLang(v as Lang)}>
              <TabsList>
                {languages.map((l) => (
                  <TabsTrigger key={l} value={l}>
                    {languageLabel[l]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {form.hasUddipok && (
            <Field data-invalid={!!errors.uddipok}>
              <FieldLabel>
                Stimulus (উদ্দীপক)<span className="text-destructive">*</span>
              </FieldLabel>
              <QuestionEditor
                key={`uddipok-${shown}-${version}`}
                lang={shown}
                value={form.uddipok[shown]}
                onChange={(html) => set({ uddipok: text(form.uddipok, html) }, "uddipok")}
                placeholder="The passage, data or figure the questions are about"
                invalid={!!errors.uddipok}
              />
              <FieldError>{errors.uddipok}</FieldError>
            </Field>
          )}

          {form.items.map((item, index) => {
            const e = (field: string) => errors[`items.${index}.${field}`]
            return (
              <div key={`${index}-${version}`} className={cn("flex flex-col gap-3", (form.items.length > 1 || form.type === "CQ") && "rounded-lg border p-3")}>
                {(form.items.length > 1 || form.type === "CQ") && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {form.type === "CQ" ? `${labels[index]}.` : `Question ${index + 1}`}
                    </span>
                    {form.items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          set({ items: form.items.filter((_, i) => i !== index) })
                          setErrors({})
                          setVersion((v) => v + 1)
                        }}
                      >
                        <Trash2Icon />
                        <span className="sr-only">Remove</span>
                      </Button>
                    )}
                  </div>
                )}
                <div className={cn("grid gap-3", form.type === "CQ" && "sm:grid-cols-[1fr_7rem]")}>
                  <Field data-invalid={!!e("text")}>
                    <FieldLabel>
                      {form.type === "CQ" ? "Sub-question" : "Question"}
                      <span className="text-destructive">*</span>
                    </FieldLabel>
                    <QuestionEditor
                      key={`text-${index}-${shown}-${version}`}
                      lang={shown}
                      value={item.text[shown]}
                      onChange={(html) => setItem(index, { text: text(item.text, html) }, "text")}
                      invalid={!!e("text")}
                    />
                    <FieldError>{e("text")}</FieldError>
                  </Field>
                  {form.type === "CQ" && (
                    <Field data-invalid={!!e("marks")}>
                      <FieldLabel htmlFor={`marks-${index}`}>
                        Marks<span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        id={`marks-${index}`}
                        type="number"
                        min={0}
                        step={0.5}
                        value={String(item.marks)}
                        onChange={(ev) => setItem(index, { marks: Number(ev.target.value) }, "marks")}
                        aria-invalid={!!e("marks")}
                      />
                      <FieldError>{e("marks")}</FieldError>
                    </Field>
                  )}
                </div>

                {form.type === "MCQ" && (
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1 text-sm font-medium">
                      Options — tick the correct one<span className="text-destructive">*</span>
                    </legend>
                    <div className="grid gap-3 md:grid-cols-2">
                      {MCQ_OPTIONS.map((letter, o) => (
                        <div key={letter} className="flex items-start gap-2">
                          <label
                            className={cn(
                              "mt-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                              item.answer === letter ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                            )}
                            title={`Option ${letter} is correct`}
                          >
                            <input
                              type="radio"
                              className="sr-only"
                              name={`answer-${index}`}
                              checked={item.answer === letter}
                              onChange={() => setItem(index, { answer: letter }, "answer")}
                            />
                            {optionLabels[shown][o]}
                          </label>
                          <div className="min-w-0 flex-1">
                            <QuestionEditor
                              key={`option-${index}-${o}-${shown}-${version}`}
                              compact
                              lang={shown}
                              value={item.options[o]?.[shown] ?? ""}
                              onChange={(html) =>
                                setItem(
                                  index,
                                  { options: item.options.map((opt, k) => (k === o ? text(opt, html) : opt)) },
                                  `option.${o}`
                                )
                              }
                              invalid={!!e(`option.${o}`)}
                            />
                            {e(`option.${o}`) && <p className="mt-1 text-xs text-destructive">{e(`option.${o}`)}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {e("answer") && <p className="text-sm text-destructive">{e("answer")}</p>}
                    <Label className="flex items-center gap-2 font-normal">
                      <Checkbox
                        checked={item.shuffleOptions}
                        onCheckedChange={(on) => setItem(index, { shuffleOptions: on === true })}
                      />
                      Sets may shuffle the options (untick for “all of the above” and the like)
                    </Label>
                  </fieldset>
                )}

                <Field>
                  <FieldLabel>Solution / explanation</FieldLabel>
                  <QuestionEditor
                    key={`solution-${index}-${shown}-${version}`}
                    lang={shown}
                    value={item.solution[shown]}
                    onChange={(html) => setItem(index, { solution: text(item.solution, html) })}
                    placeholder="Optional; printed only when asked for"
                  />
                </Field>
              </div>
            )
          })}
          {errors.items && <p className="text-sm text-destructive">{errors.items}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            {form.items.length < maxItems && (form.type === "CQ" || form.hasUddipok) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set({ items: [...form.items, blankItem(form.type, form.items.length)] }, "items")}
              >
                <PlusIcon data-icon="inline-start" />
                {form.type === "CQ" ? "Add sub-question" : "Add question"}
              </Button>
            ) : (
              <span />
            )}
            {form.hasUddipok && form.items.length > 1 && (
              <Label className="flex items-center gap-2 font-normal">
                <Checkbox checked={form.shuffleItems} onCheckedChange={(on) => set({ shuffleItems: on === true })} />
                Sets may reorder the questions under the stimulus
              </Label>
            )}
          </div>
          {form.type === "CQ" && (
            <FieldDescription>
              A generated CQ paper uses only questions whose marks add up to what each answered question carries (e.g. 10 for 7 of 70 marks).
            </FieldDescription>
          )}
        </CardContent>
        <CardFooter className="flex-wrap justify-end gap-2 border-t">
          <Button asChild type="button" variant="outline">
            <Link href={listHref}>Back</Link>
          </Button>
          {isNew ? (
            <>
              <Button type="button" variant="secondary" onClick={() => save("Draft", true)}>
                Save draft and new
              </Button>
              <Button type="button" variant="secondary" onClick={() => save("Draft")}>
                Save as draft
              </Button>
              <Button type="button" onClick={() => save("Approved")}>
                Save and approve
              </Button>
            </>
          ) : (
            <Button type="submit">Update</Button>
          )}
        </CardFooter>
      </Card>
    </form>
  )
}
