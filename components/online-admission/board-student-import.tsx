"use client"

import * as React from "react"
import Link from "next/link"
import readXlsxFile from "read-excel-file/browser"
import writeExcelFile from "write-excel-file/browser"
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
import { Pick } from "@/components/students/student-import"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { branchStore, classStore, shiftStore, yearStore } from "@/lib/academic-store"
import {
  boardImportFields,
  importBoardStudents,
  planBoardImport,
  useBoardStudents,
  type BoardImportPlan,
  type BoardMapping,
} from "@/lib/board-students"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { useEducationBoards } from "@/lib/education-boards"
import { academicMediums } from "@/lib/institutes"
import { autoMap, columnLetter, parseCsv, type SheetRows } from "@/lib/student-import"

// Radix Select can't use "" as a value.
const NONE = "__none"
const MAX_ERRORS_SHOWN = 200

type Workbook = { fileName: string; sheets: { name: string; rows: SheetRows }[] }

// Legacy StudentAdmission/ImportExcel ("Board Student Import"): SSC passers
// of one class and year from the board's result sheet, matched by SSC roll
// + board. Only classes with board admission enabled are offered.
export function BoardStudentImport() {
  const user = useCurrentUser()
  const existing = useBoardStudents()
  const boards = useEducationBoards()
  const institutes = useAccessibleInstitutes()
  const canPick = institutes.length > 1

  const [instituteId, setInstituteId] = React.useState(
    canPick ? "" : String(institutes[0]?.id ?? "")
  )
  const [branchId, setBranchId] = React.useState("")
  const [medium, setMedium] = React.useState("")
  const [yearId, setYearId] = React.useState("")
  const [classId, setClassId] = React.useState("")
  const [workbook, setWorkbook] = React.useState<Workbook | null>(null)
  const [sheetIndex, setSheetIndex] = React.useState(0)
  const [mapping, setMapping] = React.useState<BoardMapping>({})
  // The last check, valid only while the inputs it was made for are unchanged.
  const [checked, setChecked] = React.useState<{ key: string; plan: BoardImportPlan; rows: SheetRows; imported?: boolean } | null>(null)
  // Bumped on every file read, so re-choosing the same file counts as a change.
  const [fileVersion, setFileVersion] = React.useState(0)
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({})
  const [reading, setReading] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)
  const fileInput = React.useRef<HTMLInputElement>(null)

  const institute = institutes.find((i) => String(i.id) === instituteId)
  const iid = institute?.id ?? -1
  const branches = branchStore.useList(iid)
  const years = yearStore.useList(iid)
  const shifts = shiftStore.useList(iid)
  // Legacy LoadBoardAdmissionEnabledAcademicClass, narrowed by medium.
  const classes = classStore
    .useList(iid)
    .filter((c) => c.enableBoardAdmission && (!institute?.enableMedium || !medium || c.medium === medium))

  const fields = boardImportFields.filter((f) => f.key !== "version" || institute?.enableVersion)
  const isRequired = (key: string) =>
    key === "version" ? !!institute?.enableVersion : !!fields.find((f) => f.key === key)?.required
  const sheet = workbook?.sheets[sheetIndex]
  const headers = sheet?.rows[0] ?? []
  const dataRows = sheet ? sheet.rows.slice(1) : []

  const inputsKey = JSON.stringify([instituteId, branchId, medium, yearId, classId, fileVersion, sheetIndex, mapping])
  const plan = checked?.key === inputsKey ? checked.plan : null
  const imported = !!plan && !!checked?.imported

  function pickInstitute(value: string) {
    setInstituteId(value)
    setBranchId("")
    setMedium("")
    setYearId("")
    setClassId("")
    setErrors({})
  }

  function selectSheet(book: Workbook, index: number) {
    setSheetIndex(index)
    setMapping(autoMap(book.sheets[index]?.rows[0] ?? [], boardImportFields))
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
        throw new Error("Only Excel File Is Required.")
      }
      if (!book.sheets.length) throw new Error("No Excel Sheet Found.")
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
    if (!institute) next.institute = "No Institute Found."
    if (institute?.enableBranch && !branchId) next.branch = "No Branch Found."
    if (institute?.enableMedium && !medium) next.medium = "No Academic Medium Found."
    if (!yearId) next.year = "Please select Academic Year."
    if (!classId) next.class = "Please select Academic Class."
    if (!workbook) next.file = "No Import File Found."
    for (const field of fields) {
      if (isRequired(field.key) && mapping[field.key] == null) {
        next[`map.${field.key}`] = `Please select ${field.label}.`
      }
    }
    setErrors(next)
    if (Object.keys(next).length || !institute || !sheet) {
      toast.error("Please select the required data.")
      return
    }

    const result = planBoardImport({
      rows: dataRows,
      mapping,
      target: {
        instituteId: institute.id,
        branchId: institute.enableBranch ? Number(branchId) : null,
        medium: institute.enableMedium ? medium : "",
        yearId: Number(yearId),
        classId: Number(classId),
        versionEnabled: institute.enableVersion,
      },
      boards,
      shifts,
      existing,
    })
    setChecked({ key: inputsKey, plan: result, rows: dataRows })
  }

  function runImport() {
    if (!plan) return
    importBoardStudents(plan.creates, plan.updates, user.name)
    const count = plan.creates.length + plan.updates.length
    if (plan.errors.length) {
      toast.warning(`Error Occurred, for more detail download the error sheet. Success Count: ${count}`)
    } else {
      toast.success(`Import Successfully. Success Count: ${count}`)
    }
    setConfirming(false)
    // Kept for View Excel; importing the same check again would add the rows twice.
    setChecked((current) => current && { ...current, imported: true })
  }

  // The legacy error sheet: the row's mapped values and why it was skipped.
  async function downloadErrors() {
    if (!checked || !plan?.errors.length) return
    const bold = (value: string) => ({ value, fontWeight: "bold" as const })
    const columns = ["roll", "registration", "board", "passingYear", "group", "version", "shift", "quota", "name", "mobile", "gender", "remarks"] as const
    const titles = ["Sl", "SSC Roll", "SSC Registration", "Board", "Passing Year", "Academic Group", "Academic Version", "Shift", "Quota", "Student Name", "Mobile", "Gender", "Remarks", "Why?"]
    const data = [
      titles.map(bold),
      ...plan.errors.map((error, index) => {
        const row = checked.rows[error.row - 2] ?? []
        return [
          index + 1,
          ...columns.map((key) => (mapping[key] == null ? null : row[mapping[key]!] == null ? null : String(row[mapping[key]!]))),
          `Row ${error.row}: ${error.message}`,
        ]
      }),
    ]
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-")
    await writeExcelFile(data, {
      columns: [{ width: 6 }, ...columns.map(() => ({ width: 16 })), { width: 50 }],
    }).toFile(`${stamp}_error.xlsx`)
  }

  const errorRows = plan ? new Set(plan.errors.map((e) => e.row)).size : 0
  const ready = plan && !plan.fatal && !imported ? plan.creates.length + plan.updates.length : 0
  const columnOptions = headers.map((header, index) => ({
    value: String(index),
    label: `${columnLetter(index)} · ${String(header ?? "").trim() || "(no header)"}`,
  }))

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Board Student Import</CardTitle>
            <CardDescription>
              Import board students from Excel for online admission. Rows are matched by SSC roll
              and board: a known one is updated, a new one is added.
            </CardDescription>
          </div>
          {plan && plan.errors.length > 0 && !plan.fatal && (
            <Button type="button" variant="destructive" size="sm" onClick={downloadErrors}>
              <DownloadIcon data-icon="inline-start" />
              View Excel
            </Button>
          )}
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
            {institute?.enableBranch && (
              <Pick
                label="Branch"
                required
                value={branchId}
                onChange={setBranchId}
                options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                placeholder="Select branch"
                error={errors.branch}
              />
            )}
            {institute?.enableMedium && (
              <Pick
                label="Academic medium"
                required
                value={medium}
                onChange={(value) => {
                  setMedium(value)
                  setClassId("")
                }}
                options={academicMediums.map((m) => ({ value: m, label: m }))}
                placeholder="Select medium"
                error={errors.medium}
              />
            )}
            <Pick
              label="Academic year"
              required
              value={yearId}
              onChange={setYearId}
              options={years.map((y) => ({
                value: String(y.id),
                label: y.isCurrent ? `${y.name} (current)` : y.name,
              }))}
              placeholder={institute ? "Select year" : "Pick an institute first"}
              error={errors.year}
              disabled={!institute}
            />
            <Pick
              label="Academic class"
              required
              value={classId}
              onChange={setClassId}
              options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
              placeholder={
                !institute
                  ? "Pick an institute first"
                  : classes.length
                    ? "Select class"
                    : "No class has board admission enabled"
              }
              error={errors.class}
              disabled={!institute || !classes.length}
            />
            <Field data-invalid={!!errors.file}>
              <FieldLabel htmlFor="boardImportFile">
                Excel file
                <span className="text-destructive" aria-hidden>
                  *
                </span>
              </FieldLabel>
              <Input
                ref={fileInput}
                id="boardImportFile"
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {fields.map((field) => (
                  <Pick
                    key={field.key}
                    label={field.label}
                    required={isRequired(field.key)}
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
            </Fieldset>
          )}

          <div className="flex flex-wrap justify-center gap-2 border-t pt-4">
            <Button asChild variant="outline">
              <Link href="/dashboard">
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
              Import Student{ready ? ` (${ready})` : ""}
            </Button>
          </div>
        </CardContent>
      </Card>

      {plan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheetIcon className="size-5 text-muted-foreground" />
              {imported ? "Import result" : "Check result"}
            </CardTitle>
            <CardDescription>
              {plan.fatal ? (
                <span className="text-destructive">{plan.fatal} Nothing will be imported.</span>
              ) : (
                <span className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary">
                    {plan.creates.length} {imported ? "added" : "new"}
                  </Badge>
                  <Badge variant="secondary">
                    {plan.updates.length} {imported ? "updated" : "to update"}
                  </Badge>
                  <Badge variant={errorRows ? "destructive" : "outline"}>
                    {errorRows} row{errorRows === 1 ? "" : "s"} with errors (skipped)
                  </Badge>
                </span>
              )}
            </CardDescription>
          </CardHeader>
          {plan.errors.length > 0 && !plan.fatal && (
            <CardContent className="flex flex-col gap-2">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="w-20">Row</TableHead>
                      <TableHead className="w-48">Column</TableHead>
                      <TableHead>Why?</TableHead>
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
                  Showing the first {MAX_ERRORS_SHOWN} of {plan.errors.length} problems. View Excel
                  lists them all.
                </p>
              )}
            </CardContent>
          )}
        </Card>
      )}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import {ready} board students?</AlertDialogTitle>
            <AlertDialogDescription>
              {plan?.creates.length ?? 0} new board students are added and{" "}
              {plan?.updates.length ?? 0} existing ones are updated for{" "}
              {classes.find((c) => String(c.id) === classId)?.name}{" "}
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
