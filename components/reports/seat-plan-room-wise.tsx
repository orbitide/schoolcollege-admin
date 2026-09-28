"use client"

import Link from "next/link"
import { PrinterIcon } from "lucide-react"

import { ExamReportEmpty, ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
import { PrintArea } from "@/components/reports/print-area"
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
import { roomStudents, seatLayout, useExamSeatPlans, type ExamSeatPlan } from "@/lib/exam-seat-plans"
import { roomCapacity, type Building, type BuildingRoom, type Institute } from "@/lib/institutes"
import { useMeritLists } from "@/lib/merit-lists"
import { useStudents } from "@/lib/students"
import type { TermExam } from "@/lib/term-exams"
import { cn, parseInlineStyle } from "@/lib/utils"

type RoomPage = {
  plan: ExamSeatPlan
  building: Building
  room: BuildingRoom
  rolls: string[]
  rollFrom: string
  rollTo: string
}

const td = "border border-black px-1.5 py-1 text-center"

// Legacy SeatPlanReport.cshtml: a page per room — the institute heading,
// the exam, date and time, the subject, the room's roll range, student
// count and number, then its columns side by side, each bench a row with
// a roll per seat ("-" where a seat is empty) — and "x of y".
function RoomWiseSheet({
  institute,
  exam,
  subjectLabel,
  pages,
}: {
  institute: Institute
  exam: TermExam
  subjectLabel: string
  pages: RoomPage[]
}) {
  const config = institute.configuration
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  const box = "border border-black px-3 py-1"
  const printed = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

  return (
    <div className="flex flex-col gap-10 bg-white font-serif text-sm text-black">
      {pages.map(({ plan, building, room, rolls, rollFrom, rollTo }, p) => {
        const columns = seatLayout(rolls, room)
        return (
          <section key={`${plan.id}-${building.id}-${room.id}`} className="flex break-after-page flex-col gap-4 last:break-after-auto">
            <header className="flex items-center justify-center gap-5">
              <div style={{ width: logoWidth }} className="shrink-0">
                {institute.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={institute.logoUrl} alt="" className="h-auto w-full" />
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5 text-center">
                <h1 style={parseInlineStyle(config.reportHeaderStyle)}>{institute.name}</h1>
                <p className="text-lg">{exam.name}</p>
                <h2 style={parseInlineStyle(config.reportNameStyle)}>Seat Plan</h2>
                <p style={parseInlineStyle(config.reportNameStyle)}>
                  Date: {formatExamDate(plan.examDate)}   Time: {formatTime(plan.startTime)} - {formatTime(plan.endTime)}
                </p>
              </div>
              <div style={{ width: logoWidth }} className="shrink-0" />
            </header>

            <p className="mx-auto flex text-base">
              <span className={box}>Subject</span>
              <strong className="border-y border-r border-black px-3 py-1">{subjectLabel}</strong>
            </p>
            <p className="mx-auto flex flex-wrap text-base">
              <span className={box}>Roll Range</span>
              <strong className="border-y border-black px-3 py-1 tabular-nums">
                {rollFrom} - {rollTo}
              </strong>
              <strong className={cn(box, "tabular-nums")}>{rolls.length}</strong>
              <span className="border-y border-black px-3 py-1">Room No</span>
              <strong className={box}>{room.name}</strong>
            </p>

            <div className="flex items-start gap-3">
              {columns.map((benches, c) => (
                <table key={c} className="min-w-0 flex-1 border-collapse text-lg tabular-nums">
                  <thead>
                    <tr>
                      <th className={td} colSpan={room.studentsPerBench}>
                        Column-{c + 1}
                      </th>
                    </tr>
                    <tr>
                      {Array.from({ length: room.studentsPerBench }, (_, s) => (
                        <th key={s} className={cn(td, "text-sm font-normal")}>
                          Roll
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {benches.map((seats, b) => (
                      <tr key={b}>
                        {/* Legacy prints a bench's seats last first. */}
                        {[...seats].reverse().map((roll, s) => (
                          <td key={s} className={td}>
                            {roll}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>

            <p className="flex flex-wrap justify-between gap-2 text-xs">
              <span>
                Room#{room.name}, {building.name}, {institute.name}. {printed}
              </span>
              <strong className="text-sm">
                {p + 1} of {pages.length}
              </strong>
            </p>
          </section>
        )
      })}
    </div>
  )
}

// Legacy RptExamSeatPlan/SeatPlanReport ("Seat Plan (Room Wise)"): pick an
// exam and a subject — a building or room to narrow it — and print each
// room's seat plan to post on its door. Everything lives in the URL.
export function SeatPlanRoomWise() {
  const f = useExamReportFilter({ meritList: false })
  const { institute, chosen, param, setParam } = f
  const plans = useExamSeatPlans()
  const students = useStudents()
  const meritLists = useMeritLists()
  const name = useStudentLookups()
  const iid = institute?.id ?? -1
  const subjects = subjectStore.useList(iid)
  const buildings = buildingStore.useList(iid)

  const subject = chosen?.subjects.find((s) => String(s.subjectId) === param("subject"))
  const subjectOf = (id: number) => subjects.find((s) => s.id === id)
  const subjectName = (id: number) => subjectOf(id)?.name ?? name("subject", id)
  const subjectLabel = (id: number) => {
    const code = subjectOf(id)?.code.trim()
    return code ? `${subjectName(id)} (${code})` : subjectName(id)
  }

  const matching = chosen && subject ? plans.filter((p) => p.termExamId === chosen.id && p.subjectId === subject.subjectId) : []
  // The rooms the plans use, building by building in rank and room order.
  const used = matching
    .flatMap((plan) =>
      plan.rooms.flatMap((r) => {
        const building = buildings.find((b) => b.id === r.buildingId)
        const room = building?.rooms.find((x) => x.id === r.roomId)
        return building && room ? [{ plan, seat: r, building, room }] : []
      })
    )
    .sort(
      (a, b) =>
        a.building.rank - b.building.rank ||
        a.building.rooms.indexOf(a.room) - b.building.rooms.indexOf(b.room)
    )
  const buildingOptions = [...new Map(used.map((u) => [u.building.id, u.building])).values()]
  const building = buildingOptions.find((b) => String(b.id) === param("building"))
  const roomOptions = used.filter((u) => !building || u.building.id === building.id)
  const roomPick = roomOptions.find((u) => `${u.building.id}-${u.room.id}` === param("room"))

  const pages: RoomPage[] =
    chosen && institute
      ? (roomPick ? [roomPick] : roomOptions).map(({ plan, seat, building: b, room }) => {
          const seated = roomStudents(plan, seat, chosen, { students, meritLists })
          const rolls = seated.map(({ student, enrolment }) =>
            institute.showClassRoll ? enrolment.classRoll : String(student.studentIdentificationNo)
          )
          return { plan, building: b, room, rolls, rollFrom: rolls[0] ?? "-", rollTo: rolls.at(-1) ?? "-" }
        })
      : []

  const sheet = institute && chosen && subject && pages.length > 0 && (
    <RoomWiseSheet institute={institute} exam={chosen} subjectLabel={subjectLabel(subject.subjectId)} pages={pages} />
  )
  const overfull = pages.filter((p) => p.rolls.length > roomCapacity(p.room))

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Seat Plan (Room Wise)</CardTitle>
          <CardDescription>Each room&apos;s seat plan, bench by bench, to post on its door.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ExamReportFilterFields filter={f} />
          <FilterField
            label="Subject"
            required
            value={subject ? String(subject.subjectId) : ""}
            onChange={(v) => setParam({ subject: v, building: "", room: "" })}
            options={(chosen?.subjects ?? []).map((s) => ({ value: String(s.subjectId), label: subjectName(s.subjectId) }))}
            placeholder="Select subject"
            disabled={!chosen}
          />
          <FilterField
            label="Building"
            value={building ? String(building.id) : ""}
            onChange={(v) => setParam({ building: v, room: "" })}
            options={buildingOptions.map((b) => ({ value: String(b.id), label: b.name }))}
            allLabel="All buildings"
            disabled={!buildingOptions.length}
          />
          <FilterField
            label="Room"
            value={roomPick ? `${roomPick.building.id}-${roomPick.room.id}` : ""}
            onChange={(v) => setParam({ room: v })}
            options={roomOptions.map((u) => ({
              value: `${u.building.id}-${u.room.id}`,
              label: building ? u.room.name : `${u.building.name} · ${u.room.name}`,
            }))}
            allLabel="All rooms"
            disabled={!roomOptions.length}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Seat Plan</CardTitle>
            <CardDescription>
              {sheet
                ? `${chosen.fullName} · ${subjectName(subject.subjectId)} · ${pages.length} room${pages.length === 1 ? "" : "s"}, a page each${overfull.length ? ` · ${overfull.map((p) => p.room.name).join(", ")} over capacity since the plan was made` : ""}`
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
              <div className="mx-auto max-w-[56rem] min-w-[36rem]">{sheet}</div>
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
