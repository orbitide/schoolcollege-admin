"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { groupStore, subjectStore } from "@/lib/academic-store"
import type { ClassYearSubject } from "@/lib/institutes"

// The subject list of legacy ClassYearSubject/Details: each subject with its
// type, group and the marks / pass marks of every part.
export function ClassYearSubjectDetails({ record }: { record: ClassYearSubject }) {
  const subjects = subjectStore.useAll()
  const groups = groupStore.useAll()
  const name = (list: { id: number; name: string }[], id: number | null) =>
    id == null ? "All" : (list.find((item) => item.id === id)?.name ?? "—")
  const hasGroups = record.details.some((detail) => detail.groupId != null)
  const pair = (marks: number, pass: number) => (marks ? `${marks} / ${pass}` : "—")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subject List</CardTitle>
        <CardDescription>Marks / pass marks of each part.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Subject Type</TableHead>
                {hasGroups && <TableHead>Academic Group</TableHead>}
                <TableHead className="text-right">Theory</TableHead>
                <TableHead className="text-right">CQ</TableHead>
                <TableHead className="text-right">MCQ</TableHead>
                <TableHead className="text-right">MCQ per question</TableHead>
                <TableHead className="text-right">Negative MCQ</TableHead>
                <TableHead className="text-right">Practical</TableHead>
                <TableHead className="text-right">Class test</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Accept partial</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {record.details.map((d, index) => (
                <TableRow key={`${d.subjectId}-${d.groupId}-${index}`}>
                  <TableCell className="font-medium">{name(subjects, d.subjectId)}</TableCell>
                  <TableCell>{d.subjectType}</TableCell>
                  {hasGroups && <TableCell>{name(groups, d.groupId)}</TableCell>}
                  <TableCell className="text-right tabular-nums">{pair(d.theoryMarks, d.theoryPassMarks)}</TableCell>
                  <TableCell className="text-right tabular-nums">{pair(d.cqMarks, d.cqPassMarks)}</TableCell>
                  <TableCell className="text-right tabular-nums">{pair(d.mcqMarks, d.mcqPassMarks)}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.mcqMarksPerQuestion || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.negativeMcqMarks || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{pair(d.practicalMarks, d.practicalPassMarks)}</TableCell>
                  <TableCell className="text-right tabular-nums">{pair(d.classTestMarks, d.classTestPassMarks)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{pair(d.totalMarks, d.totalPassMarks)}</TableCell>
                  <TableCell>{d.isAcceptPartial ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
