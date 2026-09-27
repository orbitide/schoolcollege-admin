"use client"

import * as React from "react"
import Link from "next/link"
import readXlsxFile from "read-excel-file/browser"
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  ListChecksIcon,
  UploadIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Fieldset } from "@/components/students/student-form"
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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  branchStore,
  classStore,
  classYearSubjectStore,
  groupStore,
  houseStore,
  sectionStore,
  sessionStore,
  shiftStore,
  subjectStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { districtStore, GLOBAL } from "@/lib/global-settings"
import { academicMediums, academicVersions } from "@/lib/institutes"
import {
  autoMap,
  columnLetter,
  csvTemplate,
  importFields,
  parseCsv,
  planImport,
  type ImportPlan,
  type Mapping,
  type SheetRows,
} from "@/lib/student-import"
import { importStudents, nextStudentId, useStudents } from "@/lib/students"

// Radix Select can't use "" as a value.
const NONE = "__none"
const MAX_ERRORS_SHOWN = 200

type Workbook = { fileName: string; sheets: { name: string; rows: SheetRows }[] }

// Legacy "Student Import" (Views/Student/ImportExcel.cshtml): read a sheet of
// students for one class and year, map its columns, check it, then add new
// students and update existing ones (matched by Student ID).
export function StudentImport() {
  const students = useStudents()
  const institutes = useAccessibleInstitutes()
  const canPick = institutes.length > 1

  const [instituteId, setInstituteId] = React.useState(
    canPick ? "" : String(institutes[0]?.id ?? "")
  )
  const [medium, setMedium] = React.useState("")
  const [classId, setClassId] = React.useState("")
  const [yearId, setYearId] = React.useState("")
  const [workbook, setWorkbook] = React.useState<Workbook | null>(null)
  const [sheetIndex, setSheetIndex] = React.useState(0)
  const [mapping, setMapping] = React.useState<Mapping>({})
  // The last check, valid only while the inputs it was made for are unchanged.
  const [checked, setChecked] = React.useState<{ key: string; plan: ImportPlan } | null>(null)
  // Bumped on every file read, so re-choosing the same file counts as a change.
  const [fileVersion, setFileVersion] = React.useState(0)
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({})
  const [reading, setReading] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)
  const fileInput = React.useRef<HTMLInputElement>(null)

  const institute = institutes.find((i) => String(i.id) === instituteId)
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const sections = sectionStore.useList(iid)
  const branches = branchStore.useList(iid)
  const shifts = shiftStore.useList(iid)
  const groups = groupStore.useList(iid)
  const sessions = sessionStore.useList(iid)
  const houses = houseStore.useList(iid)
  const subjects = subjectStore.useList(iid)
  const subjectSets = classYearSubjectStore.useList(iid)
  const districts = districtStore.useList(GLOBAL)

  // The fields this institute uses, in the legacy mapping order.
  const fields = institute ? importFields.filter((f) => !f.when || f.when(institute)) : []
  const sheet = workbook?.sheets[sheetIndex]
  const headers = sheet?.rows[0] ?? []
  const dataRows = sheet ? sheet.rows.slice(1) : []

  // Any change to the inputs means the file has to be checked again.
  const inputsKey = JSON.stringify([instituteId, medium, classId, yearId, fileVersion, sheetIndex, mapping])
  const plan = checked?.key === inputsKey ? checked.plan : null

  function pickInstitute(value: string) {
    setInstituteId(value)
    setMedium("")
    setClassId("")
    setYearId("")
    setErrors({})
  }

  function selectSheet(book: Workbook, index: number, forInstitute = institute) {
    setSheetIndex(index)
    const available = forInstitute ? importFields.filter((f) => !f.when || f.when(forInstitute)) : importFields
    setMapping(autoMap(book.sheets[index]?.rows[0] ?? [], available))
  }

  async function readFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setReading(true)
    setErrors((current) => ({ ...current, file: undefined }))
    try {
      let book: Workbook
      if (/\.csv$/i.test(file.name)) {
        book = { fileName: file.name, sheets: [{ name: "CSV", rows: parseCsv(await file.text()) }] }
      } else if (/\.xlsx$/i.test(file.name)) {
        const sheets = await readXlsxFile(file)
        book = {
          fileName: file.name,
          sheets: sheets.map(({ sheet: name, data }) => ({
            name,
            rows: (data as SheetRows).filter((row) => row.some((cell) => cell != null && String(cell).trim())),
          })),
        }
      } else {
        throw new Error("Choose an Excel (.xlsx) or CSV file.")
      }
      if (!book.sheets.length) throw new Error("The file has no sheets.")
      setWorkbook(book)
      setFileVersion((v) => v + 1)
      selectSheet(book, 0)
    } catch (error) {
      setWorkbook(null)
      setErrors((current) => ({
        ...current,
        file: error instanceof Error ? error.message : "The file couldn't be read.",
      }))
    } finally {
      setReading(false)
    }
  }

  function check() {
    const next: Record<string, string> = {}
    if (!institute) next.institute = "Select an institute."
    if (institute?.enableMedium && !medium) next.medium = "Select a medium."
    if (!classId) next.class = "Select a class."
    if (!yearId) next.year = "Select an academic year."
    if (!workbook) next.file = "Choose a file."
    for (const field of fields) {
      if (institute && field.required?.(institute) && mapping[field.key] == null) {
        next[`map.${field.key}`] = `Map the ${field.label.toLowerCase()} column.`
      }
    }
    setErrors(next)
    if (Object.keys(next).length || !institute || !sheet) {
      toast.error("Please select the required data.")
      return
    }

    const selectedClass = classes.find((c) => String(c.id) === classId)
    const subjectSet = subjectSets.find(
      (s) =>
        String(s.classId) === classId &&
        String(s.yearId) === yearId &&
        s.medium === (institute.enableMedium ? medium : "")
    )
    const result = planImport({
      rows: dataRows,
      mapping,
      target: {
        institute,
        classId: Number(classId),
        yearId: Number(yearId),
        medium: institute.enableMedium ? medium : "",
        nextStudentId: nextStudentId(institute),
      },
      lookups: {
        branches,
        shifts,
        groups: selectedClass?.hasSubjectGroup
          ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
          : [],
        sections: sections.filter((s) => String(s.classId) === classId),
        sessions,
        houses,
        districts,
        versions: academicVersions,
        subjects: (subjectSet?.details ?? []).flatMap((detail) => {
          const subject = subjects.find((s) => s.id === detail.subjectId)
          return subject
            ? [{ id: subject.id, code: subject.code, compulsory: detail.subjectType === "Compulsory" }]
            : []
        }),
      },
      students,
    })
    setChecked({ key: inputsKey, plan: result })
  }

  function runImport() {
    if (!plan) return
    importStudents(plan.creates, plan.updates)
    const added = plan.creates.length
    const updated = plan.updates.length
    toast.success(
      `${added} student${added === 1 ? "" : "s"} added, ${updated} updated` +
        (plan.errors.length ? `; ${new Set(plan.errors.map((e) => e.row)).size} rows skipped` : "")
    )
    setConfirming(false)
    setChecked(null)
    setWorkbook(null)
    if (fileInput.current) fileInput.current.value = ""
  }

  function downloadTemplate() {
    const blob = new Blob(["﻿" + csvTemplate(fields.length ? fields : importFields)], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "student-import-template.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const errorRows = plan ? new Set(plan.errors.map((e) => e.row)).size : 0
  const ready = plan && !plan.fatal ? plan.creates.length + plan.updates.length : 0
  const columnOptions = headers.map((header, index) => ({
    value: String(index),
    label: `${columnLetter(index)} · ${String(header ?? "").trim() || "(no header)"}`,
  }))

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Student Import</CardTitle>
            <CardDescription>
              Add or update the students of a class from an Excel sheet. Rows are matched by
              Student ID: a known ID updates that student, a new one adds a student.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <DownloadIcon data-icon="inline-start" />
            Download template
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {canPick && (
              <Pick
                label="Institute"
                required
                value={instituteId}
                onChange={pickInstitute}
                options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
                placeholder="Select institute"
                error={errors.institute}
              />
            )}
            {institute?.enableMedium && (
              <Pick
                label="Academic medium"
                required
                value={medium}
                onChange={setMedium}
                options={academicMediums.map((m) => ({ value: m, label: m }))}
                placeholder="Select medium"
                error={errors.medium}
              />
            )}
            <Pick
              label="Academic class"
              required
              value={classId}
              onChange={setClassId}
              options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
              placeholder={institute ? "Select class" : "Pick an institute first"}
              error={errors.class}
              disabled={!institute}
            />
            <Pick
              label="Academic year"
              required
              value={yearId}
              onChange={setYearId}
              options={years.map((y) => ({
                value: String(y.id),
                label: y.isCurrent ? `${y.name} (current)` : y.name,
              }))}
              placeholder="Select year"
              error={errors.year}
              disabled={!institute}
            />
            <Field data-invalid={!!errors.file}>
              <FieldLabel htmlFor="importFile">
                Excel file
                <span className="text-destructive" aria-hidden>
                  *
                </span>
              </FieldLabel>
              <Input
                ref={fileInput}
                id="importFile"
                type="file"
                accept=".xlsx,.csv"
                onChange={readFile}
                disabled={!institute || reading}
                aria-invalid={!!errors.file}
              />
              <FieldDescription>
                {reading
                  ? "Reading…"
                  : workbook
                    ? `${workbook.fileName} · ${dataRows.length} row${dataRows.length === 1 ? "" : "s"} below the header`
                    : "Excel (.xlsx) or CSV. The first row holds the column names."}
              </FieldDescription>
              <FieldError>{errors.file}</FieldError>
            </Field>
            {workbook && workbook.sheets.length > 0 && (
              <Pick
                label="Sheet"
                required
                value={String(sheetIndex)}
                onChange={(value) => selectSheet(workbook, Number(value))}
                options={workbook.sheets.map((s, i) => ({
                  value: String(i),
                  label: `${s.name} (${Math.max(0, s.rows.length - 1)} rows)`,
                }))}
              />
            )}
          </div>

          {sheet && institute && (
            <Fieldset
              legend="Columns"
              description="Match each field to a column of the sheet. Columns named like the field are matched already; leave the rest as Not in sheet."
            >
              {(["Academic Information", "Basic Information"] as const).map((group) => (
                <div key={group} className="flex flex-col gap-3">
                  <h4 className="text-sm font-semibold">{group}</h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {fields
                      .filter((f) => f.group === group)
                      .map((field) => (
                        <Pick
                          key={field.key}
                          label={
                            field.key === "classRoll"
                              ? institute.classRollLabel.trim() || field.label
                              : field.key === "studentId"
                                ? institute.studentIdLabel.trim() || field.label
                                : field.key === "house"
                                  ? institute.studentHouseLabel.trim() || field.label
                                  : field.label
                          }
                          required={field.required?.(institute)}
                          value={mapping[field.key] == null ? NONE : String(mapping[field.key])}
                          onChange={(value) => {
                            setMapping((current) => {
                              const next = { ...current }
                              if (value === NONE) delete next[field.key]
                              else next[field.key] = Number(value)
                              return next
                            })
                            setErrors((current) => ({ ...current, [`map.${field.key}`]: undefined }))
                          }}
                          options={[{ value: NONE, label: "Not in sheet" }, ...columnOptions]}
                          error={errors[`map.${field.key}`]}
                        />
                      ))}
                  </div>
                </div>
              ))}
              {institute.enableAutoIncrementStudentId && (
                <p className="text-sm text-muted-foreground">
                  Rows without a {institute.studentIdLabel.trim() || "student ID"} are added as new
                  students with the next numbers.
                </p>
              )}
            </Fieldset>
          )}

          <div className="flex flex-wrap justify-center gap-2 border-t pt-4">
            <Button asChild variant="outline">
              <Link href="/students">
                <ArrowLeftIcon data-icon="inline-start" />
                Back
              </Link>
            </Button>
            <Button type="button" variant="secondary" onClick={check} disabled={!sheet}>
              <ListChecksIcon data-icon="inline-start" />
              Check file
            </Button>
            <Button type="button" onClick={() => setConfirming(true)} disabled={!ready}>
              <UploadIcon data-icon="inline-start" />
              Import {ready || ""} student{ready === 1 ? "" : "s"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {plan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheetIcon className="size-5 text-muted-foreground" />
              Check result
            </CardTitle>
            <CardDescription>
              {plan.fatal ? (
                <span className="text-destructive">{plan.fatal} Nothing will be imported.</span>
              ) : (
                <span className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary">{plan.creates.length} new</Badge>
                  <Badge variant="secondary">{plan.updates.length} to update</Badge>
                  <Badge variant={errorRows ? "destructive" : "outline"}>
                    {errorRows} row{errorRows === 1 ? "" : "s"} with errors (skipped)
                  </Badge>
                </span>
              )}
            </CardDescription>
          </CardHeader>
          {plan.errors.length > 0 && (
            <CardContent className="flex flex-col gap-2">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="w-20">Row</TableHead>
                      <TableHead className="w-48">Column</TableHead>
                      <TableHead>Problem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.errors.slice(0, MAX_ERRORS_SHOWN).map((error, index) => (
                      <TableRow key={index}>
                        <TableCell className="tabular-nums">{error.row}</TableCell>
                        <TableCell>{error.column ?? "—"}</TableCell>
                        <TableCell className="flex items-center gap-2">
                          <CircleAlertIcon className="size-4 shrink-0 text-destructive" />
                          {error.message}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {plan.errors.length > MAX_ERRORS_SHOWN && (
                <p className="text-sm text-muted-foreground">
                  Showing the first {MAX_ERRORS_SHOWN} of {plan.errors.length} problems.
                </p>
              )}
            </CardContent>
          )}
        </Card>
      )}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import {ready} students?</AlertDialogTitle>
            <AlertDialogDescription>
              {plan?.creates.length ?? 0} new students are added and {plan?.updates.length ?? 0}{" "}
              existing students are updated in {classes.find((c) => String(c.id) === classId)?.name}{" "}
              {years.find((y) => String(y.id) === yearId)?.name}.
              {errorRows ? ` ${errorRows} rows with errors are skipped.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runImport}>Import</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Pick({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  error?: string
  disabled?: boolean
}) {
  const id = React.useId()
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </FieldLabel>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-full" aria-invalid={!!error}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldError>{error}</FieldError>
    </Field>
  )
}
