"use client"

import Link from "next/link"
import { PrinterIcon } from "lucide-react"

import { ExamReportEmpty, ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
import { PrintArea } from "@/components/reports/print-area"
import { spanAt } from "@/components/reports/result-summary-sheet"
import { useStudentLookups } from "@/components/students/student-lookups"
import { formatExamDate, formatTime } from "@/components/term-exams/seat-plan-list"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { buildingStore, subjectStore } from "@/lib/academic-store"
import { useExamSeatPlans, type ExamSeatPlan } from "@/lib/exam-seat-plans"
import { academicVersions, type Institute } from "@/lib/institutes"
import type { TermExam } from "@/lib/term-exams"
import { cn, parseInlineStyle } from "@/lib/utils"

type GlanceRow = {
  groupId: number | null
  version: string
  buildingId: number
  buildingName: string
  roomName: string
  rollFrom: string
  rollTo: string
  students: number
}

const th = "border border-black px-1.5 py-1 text-center font-semibold"
const td = "border border-black px-1.5 py-1 text-center"

// Legacy SeatPlanAtAGlanceReport.cshtml: the institute heading, the plan's
// subtitle, the exam, date and time, the subject, then the rooms under
// their group, version and building — room, roll range and total — with a
// grand total per version and the total of all.
function SeatPlanSheet({
  institute,
  exam,
  plan,
  subjectName,
  rows,
  showGroup,
  showVersion,
  name,
}: {
  institute: Institute
  exam: TermExam
  // The first matching plan, for the subtitle, date and time.
  plan: ExamSeatPlan
  subjectName: string
  rows: GlanceRow[]
  showGroup: boolean
  showVersion: boolean
  name: (kind: "group", id: number | null) => string
}) {
  const config = institute.configuration
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  const versionKey = (r: GlanceRow) => `${r.groupId}|${r.version}`
  const buildingKey = (r: GlanceRow) => `${versionKey(r)}|${r.buildingId}`
  const total = rows.reduce((sum, r) => sum + r.students, 0)
  const lead = 4 + Number(showGroup) + Number(showVersion)
  let sl = 0

  return (
    <div className="flex flex-col gap-4 bg-white font-serif text-sm text-black">
      <header className="flex items-center justify-center gap-5">
        <div style={{ width: logoWidth }} className="shrink-0">
          {institute.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={institute.logoUrl} alt="" className="h-auto w-full" />
          )}
        </div>
        <div className="flex flex-col items-center gap-0.5 text-center">
          <h1 style={parseInlineStyle(config.reportHeaderStyle)}>{institute.name}</h1>
          {plan.subtitle && <p className="text-lg">{plan.subtitle}</p>}
          <p className="text-lg">{exam.name}</p>
          <h2 style={parseInlineStyle(config.reportNameStyle)}>Seat Plan at a Glance</h2>
          <p style={parseInlineStyle(config.reportNameStyle)}>
            Date: {formatExamDate(plan.examDate)}   Time: {formatTime(plan.startTime)} - {formatTime(plan.endTime)}
          </p>
        </div>
        <div style={{ width: logoWidth }} className="shrink-0" />
      </header>
      <p className="mx-auto flex text-lg">
        <span className="border border-black px-10 py-1">Subject</span>
        <strong className="border-y border-r border-black px-10 py-1">{subjectName}</strong>
      </p>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            {showGroup && <th className={cn(th, "w-[10%]")}>Group</th>}
            {showVersion && <th className={cn(th, "w-[10%]")}>Version</th>}
            <th className={cn(th, "w-[18%]")}>Room Location</th>
            <th className={cn(th, "w-[6%]")}>Sl</th>
            <th className={cn(th, "w-[12%]")}>Room</th>
            <th className={th}>Roll Range</th>
            <th className={cn(th, "w-[10%]")}>Total</th>
            <th className={cn(th, "w-[12%]")}>Grand Total</th>
          </tr>
        </thead>
        <tbody className="text-base">
          {rows.map((r, i) => {
            const groupSpan = spanAt(rows, i, (x) => String(x.groupId))
            const versionSpan = spanAt(rows, i, versionKey)
            const buildingSpan = spanAt(rows, i, buildingKey)
            const versionTotal =
              versionSpan > 0 ? rows.slice(i, i + versionSpan).reduce((sum, x) => sum + x.students, 0) : 0
            return (
              <tr key={i}>
                {showGroup && groupSpan > 0 && (
                  <td className={td} rowSpan={groupSpan}>
                    {r.groupId != null ? name("group", r.groupId) : "—"}
                  </td>
                )}
                {showVersion && versionSpan > 0 && (
                  <td className={td} rowSpan={versionSpan}>
                    {r.version || "—"}
                  </td>
                )}
                {buildingSpan > 0 && (
                  <td className={td} rowSpan={buildingSpan}>
                    {r.buildingName}
                  </td>
                )}
                <td className={td}>{++sl}</td>
                <td className={cn(td, "font-bold")}>{r.roomName}</td>
                <td className={cn(td, "tabular-nums")}>
                  {r.rollFrom} - {r.rollTo}
                </td>
                <td className={cn(td, "tabular-nums")}>{r.students}</td>
                {versionSpan > 0 && (
                  <td className={cn(td, "font-bold tabular-nums")} rowSpan={versionSpan}>
                    {versionTotal}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="text-base font-bold">
            <td className={cn(td, "text-right")} colSpan={lead}>
              Total:
            </td>
            <td className={cn(td, "tabular-nums")} colSpan={2}>
              {total}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// Legacy RptExamSeatPlan/SeatPlanAtAGlanceReport: pick an exam and a
// subject (a group or version to narrow it) and print where its students
// sit — room by room, with the roll ranges. Everything lives in the URL.
export function SeatPlanAtAGlance() {
  const f = useExamReportFilter({ meritList: false })
  const { institute, chosen, academicClass, param, setParam } = f
  const plans = useExamSeatPlans()
  const name = useStudentLookups()
  const iid = institute?.id ?? -1
  const subjects = subjectStore.useList(iid)
  const buildings = buildingStore.useList(iid)

  const subject = chosen?.subjects.find((s) => String(s.subjectId) === param("subject"))
  const classGroups =
    institute?.enableGroup && academicClass?.hasSubjectGroup
      ? f.groups.filter((g) => academicClass.groupIds.includes(g.id))
      : []
  const group = classGroups.find((g) => String(g.id) === param("group"))
  const version = institute?.enableVersion ? param("version") : ""
  const subjectName = (id: number) => subjects.find((s) => s.id === id)?.name ?? name("subject", id)

  const matching =
    chosen && subject
      ? plans
          .filter((p) => p.termExamId === chosen.id && p.subjectId === subject.subjectId)
          .sort((a, b) => a.examDate.localeCompare(b.examDate) || a.startTime.localeCompare(b.startTime))
      : []
  const buildingRank = new Map(buildings.map((b) => [b.id, b.rank]))
  const groupRank = new Map(f.groups.map((g) => [g.id, g.rank]))
  const rank = (map: Map<number, number>, id: number | null) => (id == null ? 1e9 : (map.get(id) ?? 1e9 - 1))
  const rows = matching
    .flatMap((p) =>
      p.rooms.map((r) => {
        const building = buildings.find((b) => b.id === r.buildingId)
        const roomIndex = building?.rooms.findIndex((x) => x.id === r.roomId) ?? -1
        return {
          groupId: r.groupId,
          version: r.version,
          buildingId: r.buildingId,
          buildingName: building?.name ?? "—",
          roomName: roomIndex >= 0 ? building!.rooms[roomIndex].name : "—",
          roomIndex,
          rollFrom: r.rollFrom,
          rollTo: r.rollTo,
          students: r.students,
        }
      })
    )
    .filter((r) => (!group || r.groupId === group.id) && (!version || r.version === version))
    .sort(
      (a, b) =>
        rank(groupRank, a.groupId) - rank(groupRank, b.groupId) ||
        academicVersions.indexOf(a.version as never) - academicVersions.indexOf(b.version as never) ||
        rank(buildingRank, a.buildingId) - rank(buildingRank, b.buildingId) ||
        a.roomIndex - b.roomIndex
    )

  const sheet = institute && chosen && subject && matching.length > 0 && rows.length > 0 && (
    <SeatPlanSheet
      institute={institute}
      exam={chosen}
      plan={matching[0]}
      subjectName={subjectName(subject.subjectId)}
      rows={rows}
      showGroup={rows.some((r) => r.groupId != null)}
      showVersion={rows.some((r) => !!r.version)}
      name={name}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Seat Plan At a Glance</CardTitle>
          <CardDescription>Where a subject&apos;s examinees sit: room by room, with the roll ranges.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ExamReportFilterFields filter={f} />
          <FilterField
            label="Subject"
            required
            value={subject ? String(subject.subjectId) : ""}
            onChange={(v) => setParam({ subject: v })}
            options={(chosen?.subjects ?? []).map((s) => ({ value: String(s.subjectId), label: subjectName(s.subjectId) }))}
            placeholder="Select subject"
            disabled={!chosen}
          />
          {classGroups.length > 0 && (
            <FilterField
              label="Group"
              value={group ? String(group.id) : ""}
              onChange={(v) => setParam({ group: v })}
              options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
              allLabel="All groups"
            />
          )}
          {institute?.enableVersion && (
            <FilterField
              label="Version"
              value={version}
              onChange={(v) => setParam({ version: v })}
              options={academicVersions.map((v) => ({ value: v, label: v }))}
              allLabel="All versions"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Seat Plan at a Glance</CardTitle>
            <CardDescription>
              {sheet
                ? `${chosen.fullName} · ${subjectName(subject.subjectId)} · ${rows.length} room${rows.length === 1 ? "" : "s"}, ${rows.reduce((s, r) => s + r.students, 0)} students`
                : "Pick an exam and a subject."}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!sheet}>
            <PrinterIcon data-icon="inline-start" />
            Print
          </Button>
        </CardHeader>
        <CardContent>
          {sheet ? (
            <div className="overflow-x-auto rounded-md border p-4">
              <div className="mx-auto max-w-[52rem] min-w-[36rem]">{sheet}</div>
            </div>
          ) : chosen && !subject ? (
            <ExamReportEmpty filter={f} empty emptyMessage="Select a subject" />
          ) : chosen && subject ? (
            <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
              <p>No seat plan for {subjectName(subject.subjectId)} of {chosen.fullName} yet.</p>
              <Button asChild size="sm" variant="outline">
                <Link href={`/term-exam/seat-plans/new?exam=${chosen.id}&subject=${subject.subjectId}`}>Generate seat plan</Link>
              </Button>
            </div>
          ) : (
            <ExamReportEmpty filter={f} empty={false} />
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize="210mm 297mm">{sheet}</PrintArea>}
    </div>
  )
}
