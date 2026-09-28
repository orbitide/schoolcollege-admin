"use client"

import * as React from "react"
import Link from "next/link"
import {
  CircleAlertIcon,
  FlaskConicalIcon,
  SendIcon,
  TriangleAlertIcon,
  UsersIcon,
  WalletIcon,
  SmartphoneIcon,
  MessageSquareTextIcon,
} from "lucide-react"
import { toast } from "sonner"

import { insertAtCursor, KeywordPicker } from "@/components/sms/sms-message"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  branchStore,
  classStore,
  groupStore,
  sectionStore,
  shiftStore,
  subjectStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { useExamAttendance } from "@/lib/exam-attendance"
import { academicMediums, academicVersions } from "@/lib/institutes"
import {
  buildSmsBatch,
  marksTypes,
  PASS_NOT_CALCULATED,
  sendSmsProblems,
  sendSmsTypes,
  type MarksType,
  type SendSmsInput,
} from "@/lib/send-sms"
import {
  newCampaignName,
  queueSms,
  sendTestSms,
  smsReceivers,
  useSmsBalance,
  useSmsMessages,
  type SmsBatchInfo,
  type SmsReceiver,
} from "@/lib/sms-messages"
import {
  MAX_TEMPLATE_LENGTH,
  placeholder,
  smsAttendanceTypes,
  smsKeywords,
  smsResultTypes,
  subTypeOf,
  templateKeywords,
  unknownKeywords,
  useSmsTemplates,
  type SmsAttendanceType,
  type SmsResultType,
  type SmsType,
} from "@/lib/sms-templates"
import { todayIso, useStudentAttendance } from "@/lib/student-attendance"
import { studentTypes, useStudents, type StudentType } from "@/lib/students"
import { useTermExamMarks } from "@/lib/term-exam-marks"
import { useTermExams } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

const PREVIEW_COUNT = 10

const num = (value: string) => (value ? Number(value) : null)

// Legacy Sms/SendSms: pick the SMS type, who gets it and which students it is
// about, write (or pick) the message with keywords, check the generated SMS
// and queue them for the gateway. The counts, cost and preview follow the
// form as it changes instead of waiting for a "Count" click.
export function SendSms() {
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  // Subscriptions so the batch follows the data it is built from.
  const students = useStudents()
  const attendance = useStudentAttendance()
  const examAttendance = useExamAttendance()
  const marks = useTermExamMarks()
  const sent = useSmsMessages()
  const exams = useTermExams()
  const templates = useSmsTemplates()
  const messageRef = React.useRef<HTMLTextAreaElement>(null)

  const [instituteId, setInstituteId] = React.useState(
    institutes.length === 1 ? String(institutes[0].id) : ""
  )
  const institute = institutes.find((i) => String(i.id) === instituteId)
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const branches = branchStore.useList(iid)
  const shifts = shiftStore.useList(iid)
  const groups = groupStore.useList(iid)
  const sections = sectionStore.useList(iid)
  const subjects = subjectStore.useList(iid)
  const balance = useSmsBalance(iid)

  const [smsType, setSmsType] = React.useState<SmsType | "">("")
  const [resultType, setResultType] = React.useState<SmsResultType | "">("")
  const [attendanceType, setAttendanceType] = React.useState<SmsAttendanceType | "">("")
  const [receivers, setReceivers] = React.useState<SmsReceiver[]>(["Father"])
  const [branchId, setBranchId] = React.useState("")
  const [medium, setMedium] = React.useState("")
  const [classId, setClassId] = React.useState("")
  const [yearId, setYearId] = React.useState("")
  const [groupId, setGroupId] = React.useState("")
  const [version, setVersion] = React.useState("")
  const [shiftId, setShiftId] = React.useState("")
  const [sectionId, setSectionId] = React.useState("")
  const [studentType, setStudentType] = React.useState<StudentType | "">("")
  const [rolls, setRolls] = React.useState("")
  const [examId, setExamId] = React.useState("")
  const [subjectId, setSubjectId] = React.useState("")
  const [marksType, setMarksType] = React.useState<MarksType | "">("")
  const [attendanceDate, setAttendanceDate] = React.useState(todayIso())
  const [skipAlreadySent, setSkipAlreadySent] = React.useState(true)
  const [templateId, setTemplateId] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [campaignName, setCampaignName] = React.useState(() => newCampaignName(user.id))
  const [testMobile, setTestMobile] = React.useState("")
  const [showAll, setShowAll] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)

  const sub = subTypeOf(smsType)
  const year = yearId || String(years.find((y) => y.isCurrent)?.id ?? "")
  const selectedClass = classes.find((c) => String(c.id) === classId)
  const classGroups =
    institute?.enableGroup && selectedClass?.hasSubjectGroup
      ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
      : []
  const classSections = sections.filter(
    (s) =>
      s.status === "Active" &&
      s.classId === selectedClass?.id &&
      (!branchId || s.branchId == null || String(s.branchId) === branchId) &&
      (!shiftId || s.shiftId == null || String(s.shiftId) === shiftId) &&
      (!version || !s.version || s.version === version) &&
      (!groupId || s.groupId == null || String(s.groupId) === groupId)
  )
  const classExams = exams.filter(
    (e) =>
      e.status === "Active" &&
      e.instituteId === iid &&
      e.classId === selectedClass?.id &&
      String(e.yearId) === year
  )
  const exam = classExams.find((e) => String(e.id) === examId)
  const subjectName = (id: number) => {
    const s = subjects.find((x) => x.id === id)
    return s ? `${s.name}${s.code ? ` (${s.code})` : ""}` : String(id)
  }
  const templateOptions = templates.filter(
    (t) =>
      t.instituteId === iid &&
      t.status === "Active" &&
      t.smsType === smsType &&
      (t.branchId == null || !branchId || String(t.branchId) === branchId) &&
      (sub !== "result" || !resultType || t.resultType === resultType) &&
      (sub !== "attendance" || !attendanceType || t.attendanceType === attendanceType)
  )

  const input: SendSmsInput = {
    instituteId: iid,
    branchId: num(branchId),
    medium,
    classId: num(classId),
    yearId: num(year),
    groupId: num(groupId),
    version,
    shiftId: num(shiftId),
    sectionId: num(sectionId),
    studentType,
    rolls,
    smsType,
    resultType,
    attendanceType,
    examId: num(examId),
    subjectId: num(subjectId),
    marksType,
    attendanceDate,
    skipAlreadySent,
    receivers,
    message,
  }
  const inputKey = JSON.stringify(input)
  const problems = institute ? sendSmsProblems(input) : ["Select the institute."]
  const batch = React.useMemo(
    () => (institute ? buildSmsBatch(JSON.parse(inputKey) as SendSmsInput, institute) : undefined),
    // Rebuilt when the form or any data it reads changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inputKey, institute, students, attendance, examAttendance, marks, sent]
  )
  const rate = institute?.configuration.smsRate ?? 0
  const cost = (batch?.parts ?? 0) * rate
  const unknown = unknownKeywords(smsType, message)
  // Result keywords that only a one-subject SMS fills.
  const needSubject =
    smsType === "Result" && !subjectId
      ? templateKeywords(message).filter((k) => smsKeywords("Result").some((x) => x.label === k && x.group))
      : []
  const canSend = !problems.length && !!message.trim() && !!batch?.drafts.length
  const preview = batch ? (showAll ? batch.drafts : batch.drafts.slice(0, PREVIEW_COUNT)) : []

  function changeType(value: string) {
    setSmsType(value as SmsType)
    setResultType("")
    setAttendanceType("")
    setExamId("")
    setSubjectId("")
    setMarksType("")
    setTemplateId("")
  }

  function pickTemplate(value: string) {
    setTemplateId(value)
    const template = templates.find((t) => String(t.id) === value)
    if (template) setMessage(template.message)
  }

  function toggleReceiver(receiver: SmsReceiver, on: boolean) {
    setReceivers((current) =>
      on
        ? smsReceivers.filter((r) => r === receiver || current.includes(r))
        : current.filter((r) => r !== receiver)
    )
  }

  const info = (): SmsBatchInfo => ({
    instituteId: iid,
    branchId: num(branchId),
    campaignName,
    smsType: smsType as SmsType,
    resultType: sub === "result" ? resultType || null : null,
    attendanceType: sub === "attendance" ? attendanceType || null : null,
    examId: sub === "result" || smsType === "Exam Attendance" ? num(examId) : null,
    subjectId: num(subjectId),
    attendanceDate: smsType === "Attendance" ? attendanceDate : null,
  })

  function send() {
    setConfirming(false)
    if (!batch) return
    try {
      const parts = queueSms(
        info(),
        batch.drafts.map(({ mobile, message, studentId, numberType, chars, parts }) => ({
          mobile,
          message,
          studentId,
          numberType,
          chars,
          parts,
        })),
        user.name
      )
      toast.success(`Total ${parts} SMS queued successfully`, {
        description: `${batch.mobiles} numbers of ${batch.students} students, campaign ${campaignName}.`,
      })
      setCampaignName(newCampaignName(user.id))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The SMS could not be queued.")
    }
  }

  function test() {
    const body = batch?.drafts[0]?.message ?? message
    try {
      const mobile = sendTestSms(info(), testMobile, body, rate, user.name)
      toast.success("Test SMS sent successfully", { description: `To ${mobile}.` })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The test SMS could not be sent.")
    }
  }

  const stats = [
    {
      label: "SMS balance",
      value: rate > 0 ? Math.floor(balance / rate).toLocaleString() : "—",
      hint: institute ? `৳${balance.toLocaleString()} at ৳${rate}/SMS` : "Pick the institute",
      icon: WalletIcon,
    },
    { label: "Students", value: batch?.students ?? 0, hint: "Matching the filters", icon: UsersIcon },
    { label: "Mobile numbers", value: batch?.mobiles ?? 0, hint: "Unique per student", icon: SmartphoneIcon },
    {
      label: "Total SMS",
      value: batch?.parts ?? 0,
      hint: `≈ ৳${cost.toFixed(2)}`,
      icon: MessageSquareTextIcon,
      warn: cost > balance,
    },
  ]

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Send SMS</h2>
          <p className="text-sm text-muted-foreground">
            Choose who gets it, write or pick the message, check the preview and send.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/sms/templates">SMS templates</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className={cn("gap-1 py-4", stat.warn && "border-destructive/50")}>
            <CardContent className="flex items-center justify-between gap-3 px-4">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <span className={cn("text-2xl font-semibold tabular-nums", stat.warn && "text-destructive")}>
                  {stat.value}
                </span>
                <span className="text-xs text-muted-foreground">{stat.hint}</span>
              </div>
              <stat.icon className="size-6 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid items-start gap-4 md:gap-6 @4xl/main:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SMS</CardTitle>
            <CardDescription>What kind of SMS it is and who gets it.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {institutes.length > 1 && (
              <FilterField
                label="Institute"
                required
                value={instituteId}
                onChange={(v) => {
                  setInstituteId(v)
                  setBranchId("")
                  setMedium("")
                  setClassId("")
                  setYearId("")
                  setGroupId("")
                  setVersion("")
                  setShiftId("")
                  setSectionId("")
                  setExamId("")
                  setSubjectId("")
                  setTemplateId("")
                }}
                options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
                placeholder="Select institute"
              />
            )}
            <FilterField
              label="SMS type"
              required
              value={smsType}
              onChange={changeType}
              options={sendSmsTypes.map((t) => ({ value: t, label: t }))}
              placeholder="Select SMS type"
            />
            {sub === "result" && (
              <FilterField
                label="Result type"
                required
                value={resultType}
                onChange={(v) => {
                  setResultType(v as SmsResultType)
                  setTemplateId("")
                }}
                options={smsResultTypes.map((t) => ({
                  value: t,
                  label: t === "All" ? "All students" : `${t}ed students`,
                }))}
                placeholder="Select result type"
              />
            )}
            {sub === "attendance" && (
              <FilterField
                label={smsType === "Exam Attendance" ? "Present status" : "Attendance type"}
                required
                value={attendanceType}
                onChange={(v) => {
                  setAttendanceType(v as SmsAttendanceType)
                  setTemplateId("")
                }}
                options={smsAttendanceTypes.map((t) => ({
                  value: t,
                  label: t === "Present" ? "Present students" : "Absent students",
                }))}
                placeholder="Select"
              />
            )}
            <Field className="sm:col-span-2">
              <FieldLabel>
                Receiver
                <span className="text-destructive" aria-hidden>
                  *
                </span>
              </FieldLabel>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {smsReceivers.map((receiver) => (
                  <Label key={receiver} className="font-normal">
                    <Checkbox
                      checked={receivers.includes(receiver)}
                      onCheckedChange={(checked) => toggleReceiver(receiver, checked === true)}
                    />
                    {receiver}
                  </Label>
                ))}
              </div>
              <FieldDescription>
                Each student&apos;s numbers are sent once, even when two receivers share one.
              </FieldDescription>
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="campaign">Campaign name</FieldLabel>
              <Input
                id="campaign"
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
                className="font-mono text-sm"
              />
              <FieldDescription>Groups these SMS in the history and pending lists.</FieldDescription>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
            <CardDescription>Which students the SMS is about.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {institute?.enableBranch && (
              <FilterField
                label="Branch"
                value={branchId}
                onChange={(v) => {
                  setBranchId(v)
                  setSectionId("")
                }}
                options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                allLabel="All branches"
              />
            )}
            {institute?.enableMedium && (
              <FilterField
                label="Medium"
                value={medium}
                onChange={(v) => {
                  setMedium(v)
                  setClassId("")
                  setSectionId("")
                }}
                options={academicMediums.map((m) => ({ value: m, label: m }))}
                allLabel="All mediums"
              />
            )}
            <FilterField
              label="Class"
              required
              value={classId}
              onChange={(v) => {
                setClassId(v)
                setGroupId("")
                setSectionId("")
                setExamId("")
                setSubjectId("")
              }}
              options={classes
                .filter((c) => c.status === "Active" && (!medium || !c.medium || c.medium === medium))
                .map((c) => ({ value: String(c.id), label: c.name }))}
              placeholder={institute ? "Select class" : "Select the institute first"}
              disabled={!institute}
            />
            <FilterField
              label="Academic year"
              required
              value={year}
              onChange={(v) => {
                setYearId(v)
                setExamId("")
                setSubjectId("")
              }}
              options={years.map((y) => ({
                value: String(y.id),
                label: y.isCurrent ? `${y.name} (current)` : y.name,
              }))}
              placeholder="Select year"
              disabled={!institute}
            />
            {classGroups.length > 0 && (
              <FilterField
                label="Group"
                value={groupId}
                onChange={(v) => {
                  setGroupId(v)
                  setSectionId("")
                }}
                options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
                allLabel="All groups"
              />
            )}
            {institute?.enableVersion && (
              <FilterField
                label="Version"
                value={version}
                onChange={(v) => {
                  setVersion(v)
                  setSectionId("")
                }}
                options={academicVersions.map((v) => ({ value: v, label: v }))}
                allLabel="All versions"
              />
            )}
            {institute?.enableShift && (
              <FilterField
                label="Shift"
                value={shiftId}
                onChange={(v) => {
                  setShiftId(v)
                  setSectionId("")
                }}
                options={shifts.map((s) => ({ value: String(s.id), label: s.name }))}
                allLabel="All shifts"
              />
            )}
            <FilterField
              label="Section"
              value={sectionId}
              onChange={setSectionId}
              options={classSections.map((s) => ({ value: String(s.id), label: s.name }))}
              allLabel="All sections"
              disabled={!selectedClass}
            />
            <FilterField
              label="Student type"
              value={studentType}
              onChange={(v) => setStudentType(v as StudentType | "")}
              options={studentTypes.map((t) => ({ value: t, label: t }))}
              allLabel="All types"
            />
            <Field data-invalid={!!batch?.unknownRolls.length}>
              <FieldLabel htmlFor="rolls">Student roll(s)</FieldLabel>
              <Input
                id="rolls"
                value={rolls}
                placeholder="Comma separated, e.g. 601, 603"
                onChange={(event) => setRolls(event.target.value)}
              />
              <FieldError>
                {batch?.unknownRolls.length
                  ? `No student with roll ${batch.unknownRolls.join(", ")}.`
                  : undefined}
              </FieldError>
            </Field>

            {(sub === "result" || smsType === "Exam Attendance") && (
              <>
                <FilterField
                  label="Exam"
                  required
                  value={examId}
                  onChange={(v) => {
                    setExamId(v)
                    setSubjectId("")
                  }}
                  options={classExams.map((e) => ({ value: String(e.id), label: e.fullName }))}
                  placeholder={
                    selectedClass ? (classExams.length ? "Select exam" : "No exam for the class") : "Select the class first"
                  }
                  disabled={!selectedClass}
                />
                <FilterField
                  label="Exam subject"
                  required={smsType === "Exam Attendance"}
                  value={subjectId}
                  onChange={(v) => {
                    setSubjectId(v)
                    setMarksType("")
                  }}
                  options={(exam?.subjects ?? []).map((s) => ({
                    value: String(s.subjectId),
                    label: subjectName(s.subjectId),
                  }))}
                  allLabel={smsType === "Result" ? "All subjects" : undefined}
                  placeholder={exam ? "Select subject" : "Select the exam first"}
                  disabled={!exam}
                />
                {smsType === "Result" && subjectId && (
                  <FilterField
                    label="Marks type"
                    value={marksType}
                    onChange={(v) => setMarksType(v as MarksType | "")}
                    options={marksTypes.map((t) => ({ value: t, label: t }))}
                    allLabel="All marks types"
                  />
                )}
              </>
            )}
            {smsType === "Attendance" && (
              <>
                <Field>
                  <FieldLabel htmlFor="attendance-date">
                    Attendance date
                    <span className="text-destructive" aria-hidden>
                      *
                    </span>
                  </FieldLabel>
                  <Input
                    id="attendance-date"
                    type="date"
                    value={attendanceDate}
                    max={todayIso()}
                    onChange={(event) => event.target.value && setAttendanceDate(event.target.value)}
                  />
                </Field>
                <Label className="self-end pb-2 font-normal">
                  <Checkbox
                    checked={skipAlreadySent}
                    onCheckedChange={(checked) => setSkipAlreadySent(checked === true)}
                  />
                  Skip students already sent this day&apos;s SMS
                </Label>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message</CardTitle>
          <CardDescription>
            {smsType
              ? "Pick a template or write the message; keywords are filled for each student."
              : "Pick the SMS type to see its templates and keywords."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 @4xl/main:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <FilterField
              label="SMS template"
              value={templateId}
              onChange={pickTemplate}
              options={templateOptions.map((t) => ({ value: String(t.id), label: t.name }))}
              placeholder={
                smsType ? (templateOptions.length ? "Select template" : "No template for this SMS") : "Select the SMS type first"
              }
              disabled={!templateOptions.length}
            />
            <Field>
              <FieldLabel htmlFor="message">
                Message
                <span className="text-destructive" aria-hidden>
                  *
                </span>
              </FieldLabel>
              <Textarea
                id="message"
                ref={messageRef}
                rows={7}
                value={message}
                maxLength={MAX_TEMPLATE_LENGTH}
                placeholder="SMS message"
                onChange={(event) => setMessage(event.target.value)}
              />
              <FieldDescription>
                {batch?.drafts[0]
                  ? `First SMS: ${batch.drafts[0].chars} characters, ${batch.drafts[0].parts} SMS.`
                  : `${message.length}/${MAX_TEMPLATE_LENGTH} characters.`}
              </FieldDescription>
            </Field>
            {unknown.length > 0 && (
              <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                {smsType ? `${smsType} SMS can't fill ` : "Pick the SMS type to check "}
                {unknown.map(placeholder).join(", ")}; they would be sent as written.
              </p>
            )}
            {needSubject.length > 0 && (
              <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                Pick an exam subject to fill {needSubject.map(placeholder).join(", ")}.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">SMS keywords</p>
            {smsType ? (
              <KeywordPicker
                type={smsType}
                withSubjectOnly={smsType !== "Result" || !!subjectId}
                onPick={(keyword) => setMessage(insertAtCursor(messageRef.current, message, keyword))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Pick the SMS type first.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              {batch?.drafts.length
                ? `${batch.drafts.length} SMS to ${batch.students} students${batch.drafts.length > PREVIEW_COUNT && !showAll ? `; the first ${PREVIEW_COUNT} are shown` : ""}.`
                : "The SMS each receiver gets show here."}
            </CardDescription>
          </div>
          {batch && batch.drafts.length > PREVIEW_COUNT && (
            <Button type="button" size="sm" variant="outline" onClick={() => setShowAll((v) => !v)}>
              {showAll ? `Show first ${PREVIEW_COUNT}` : `Show all ${batch.drafts.length}`}
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {problems.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {problems.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <CircleAlertIcon className="size-4 shrink-0" />
                  {p}
                  {p === PASS_NOT_CALCULATED && (
                    <Link
                      href="/term-exam-marks/pass-fail-regenerate"
                      className="shrink-0 text-primary underline-offset-4 hover:underline"
                    >
                      Open
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <>
              {(batch?.withoutMobile || batch?.alreadySent || cost > balance) && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                  <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    {!!batch?.alreadySent && (
                      <span>
                        {batch.alreadySent} student{batch.alreadySent === 1 ? " was" : "s were"} already sent this day&apos;s SMS and {batch.alreadySent === 1 ? "is" : "are"} skipped.
                      </span>
                    )}
                    {!!batch?.withoutMobile && (
                      <span>
                        {batch.withoutMobile} student{batch.withoutMobile === 1 ? " has" : "s have"} no valid number for the chosen receivers.
                      </span>
                    )}
                    {cost > balance && (
                      <span>
                        These SMS cost ৳{cost.toFixed(2)} but the balance is ৳{balance}; the rest stay pending until it is topped up.
                      </span>
                    )}
                  </div>
                </div>
              )}
              {preview.length ? (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead className="w-12">Sl</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead className="min-w-80">Message</TableHead>
                        <TableHead>Length</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((d, index) => (
                        <TableRow key={`${d.studentId}|${d.mobile}`}>
                          <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="font-medium">{d.studentName}</div>
                            <div className="text-xs text-muted-foreground">Roll {d.roll || "—"}</div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="tabular-nums">{d.mobile}</div>
                            <div className="text-xs text-muted-foreground">{d.numberType}</div>
                          </TableCell>
                          <TableCell className="max-w-xl whitespace-pre-wrap break-words">
                            {d.message || <span className="text-muted-foreground">(empty message)</span>}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap tabular-nums text-muted-foreground">
                            {d.chars} chars
                            <br />
                            {d.parts} SMS
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No student matches these filters{smsType === "Attendance" ? " on that day" : ""}.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-end @4xl/main:justify-between">
        <div className="flex flex-wrap items-end gap-2">
          <Field className="w-56">
            <FieldLabel htmlFor="test-mobile">Test SMS</FieldLabel>
            <Input
              id="test-mobile"
              value={testMobile}
              placeholder="01XXXXXXXXX"
              inputMode="tel"
              onChange={(event) => setTestMobile(event.target.value)}
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            onClick={test}
            disabled={!institute || !smsType || !testMobile.trim() || !(batch?.drafts[0]?.message ?? message).trim()}
          >
            <FlaskConicalIcon data-icon="inline-start" />
            Send test
          </Button>
        </div>
        <Button type="button" size="lg" onClick={() => setConfirming(true)} disabled={!canSend}>
          <SendIcon data-icon="inline-start" />
          Send {batch?.parts ? `${batch.parts} SMS` : "SMS"}
        </Button>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send {batch?.parts ?? 0} SMS?</AlertDialogTitle>
            <AlertDialogDescription>
              {smsType} SMS to {batch?.mobiles ?? 0} numbers of {batch?.students ?? 0} students,
              about ৳{cost.toFixed(2)}. They are queued as pending under campaign{" "}
              <span className="font-mono">{campaignName}</span> and go out through the SMS gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {cost > balance && (
            <Badge variant="outline" className="w-fit border-destructive/50 text-destructive">
              More than the ৳{balance} balance
            </Badge>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={send}>Send</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
