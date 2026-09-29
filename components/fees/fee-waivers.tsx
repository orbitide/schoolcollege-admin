"use client"

import * as React from "react"
import { SaveIcon } from "lucide-react"
import { toast } from "sonner"

import { FeeScopeFields, useFeeScope } from "@/components/fees/fee-scope"
import { useStudentLookups } from "@/components/students/student-lookups"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCurrentUser } from "@/lib/current-user"
import { feeHeadStore, formatAmount } from "@/lib/fee-heads"
import { classFeeAmount, useClassFees } from "@/lib/fee-setup"
import { saveWaivers, useFeeWaivers, waiverReasons, type WaiverInput, type WaiverReason } from "@/lib/fee-waivers"
import { useStudents } from "@/lib/students"

type Row = { percent: string; reason: WaiverReason; note: string }

// Fees › Student Waiver: for one fee head, the percentage each student of
// a class (or section) is let off in the year, and why. Dues generated
// after saving take it off; dues already billed keep what they had.
export function FeeWaivers() {
  const scope = useFeeScope()
  const { institute, year, academicClass, section, param, setParam } = scope
  const user = useCurrentUser()
  const students = useStudents()
  const waivers = useFeeWaivers()
  const fees = useClassFees()
  const name = useStudentLookups()
  const heads = feeHeadStore.useList(institute?.id ?? -1).filter((h) => h.status === "Active")
  const head = heads.find((h) => String(h.id) === param("head"))
  const ready = institute && year && academicClass && head

  const rows = React.useMemo(() => {
    if (!institute || !year || !academicClass) return []
    return students
      .flatMap((student) => {
        if (student.instituteId !== institute.id || student.status !== "Active") return []
        const e = student.enrolments.find(
          (en) =>
            en.yearId === year.id &&
            en.classId === academicClass.id &&
            (!section || en.sectionId === section.id)
        )
        return e ? [{ student, enrolment: e }] : []
      })
      .sort(
        (a, b) =>
          (a.enrolment.sectionId ?? 0) - (b.enrolment.sectionId ?? 0) ||
          a.enrolment.classRoll.localeCompare(b.enrolment.classRoll, undefined, { numeric: true })
      )
  }, [students, institute, year, academicClass, section])

  const saved = new Map<number, Row>()
  for (const w of waivers) {
    if (w.yearId === year?.id && w.feeHeadId === head?.id) {
      saved.set(w.studentId, { percent: String(w.percent), reason: w.reason, note: w.note })
    }
  }

  const [draft, setDraft] = React.useState<Record<number, Row>>({})
  const key = `${year?.id}|${head?.id}|${academicClass?.id}|${section?.id}`
  const [draftKey, setDraftKey] = React.useState(key)
  if (draftKey !== key) {
    setDraftKey(key)
    setDraft({})
  }
  const blank: Row = { percent: "", reason: "Merit Scholarship", note: "" }
  const rowOf = (studentId: number) => draft[studentId] ?? saved.get(studentId) ?? blank
  const edit = (studentId: number, change: Partial<Row>) =>
    setDraft((d) => ({ ...d, [studentId]: { ...rowOf(studentId), ...change } }))
  const bad = (r: Row) => r.percent !== "" && !(Number(r.percent) >= 0 && Number(r.percent) <= 100)
  const invalid = Object.values(draft).some(bad)
  const amount = head && year && academicClass ? classFeeAmount(fees, year.id, academicClass.id, head.id) : 0

  function save() {
    if (!ready || invalid) return
    const changes: Record<number, WaiverInput> = {}
    for (const [id, r] of Object.entries(draft)) {
      changes[Number(id)] = { percent: Number(r.percent) || 0, reason: r.reason, note: r.note }
    }
    const changed = saveWaivers(institute.id, year.id, head.id, changes, user.name)
    setDraft({})
    toast.success(changed ? "Waivers saved successfully" : "Nothing changed", {
      description: changed ? `${changed} student${changed === 1 ? "" : "s"} updated on ${head.name}.` : undefined,
    })
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Student Waiver</CardTitle>
          <CardDescription>
            Scholarships and discounts: the percentage of a fee head each student is let off in the year.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeeScopeFields scope={scope} need={["class"]} />
          <FilterField
            label="Fee Head"
            required
            value={head ? String(head.id) : ""}
            onChange={(v) => setParam({ head: v })}
            options={heads.map((h) => ({ value: String(h.id), label: h.name }))}
            placeholder="Select a fee head"
            disabled={!institute}
          />
        </CardContent>
      </Card>

      {ready ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {head.name} · {academicClass.name}
              {section ? ` ${section.name}` : ""} · {year.name}
            </CardTitle>
            <CardDescription>
              {amount > 0
                ? `The class pays ${formatAmount(amount)}${head.frequency === "Per Absent Day" ? " per day" : ""}. 100% waives it in full; clear the percent to remove a waiver.`
                : "Fee Setup gives this class no amount for the head yet, so a waiver has nothing to take off."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-12">Sl</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="w-28">Waiver %</TableHead>
                    <TableHead className="w-48">Reason</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">Pays</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length ? (
                    rows.map(({ student, enrolment }, index) => {
                      const r = rowOf(student.id)
                      const pct = Number(r.percent) || 0
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                          <TableCell>{name("section", enrolment.sectionId)}</TableCell>
                          <TableCell className="tabular-nums">{enrolment.classRoll}</TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>
                            <Input
                              inputMode="decimal"
                              className="w-20 text-right tabular-nums"
                              aria-label={`${student.name} waiver percent`}
                              aria-invalid={bad(r)}
                              placeholder="0"
                              value={r.percent}
                              onChange={(e) => edit(student.id, { percent: e.target.value.replace(/[^\d.]/g, "") })}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={r.reason}
                              onValueChange={(v) => edit(student.id, { reason: v as WaiverReason })}
                              disabled={!pct}
                            >
                              <SelectTrigger className="w-full" aria-label="Reason">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {waiverReasons.map((reason) => (
                                    <SelectItem key={reason} value={reason}>
                                      {reason}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              aria-label="Note"
                              value={r.note}
                              disabled={!pct}
                              onChange={(e) => edit(student.id, { note: e.target.value })}
                            />
                          </TableCell>
                          <TableCell className="text-right tabular-nums whitespace-nowrap">
                            {amount > 0 ? formatAmount(amount - (amount * Math.min(pct, 100)) / 100) : "—"}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        No active student in this class for the year.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2 border-t">
            <Button variant="outline" onClick={() => setDraft({})} disabled={!Object.keys(draft).length}>
              Reset
            </Button>
            <Button onClick={save} disabled={!Object.keys(draft).length || invalid}>
              <SaveIcon data-icon="inline-start" />
              Save
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">Select the class and the fee head.</p>
      )}
    </div>
  )
}
