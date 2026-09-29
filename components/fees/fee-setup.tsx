"use client"

import * as React from "react"
import Link from "next/link"
import { CopyIcon, SaveIcon } from "lucide-react"
import { toast } from "sonner"

import { FeeScopeFields, useFeeScope } from "@/components/fees/fee-scope"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCurrentUser } from "@/lib/current-user"
import { feeHeadStore, formatAmount } from "@/lib/fee-heads"
import { copyClassFees, saveClassFees, useClassFees } from "@/lib/fee-setup"

// Fees › Fee Setup: the amount of every fee head for one class in one
// academic year (the fine per day for a Per Absent Day head). A head left
// blank or 0 isn't billed to the class. Saved amounts only change dues
// generated afterwards.
export function FeeSetup() {
  const scope = useFeeScope()
  const { institute, year, academicClass, classes } = scope
  const user = useCurrentUser()
  const fees = useClassFees()
  const heads = feeHeadStore.useList(institute?.id ?? -1).filter((h) => h.status === "Active")
  const ready = institute && year && academicClass

  const saved = React.useMemo(() => {
    const map: Record<number, string> = {}
    if (!year || !academicClass) return map
    for (const f of fees) {
      if (f.yearId === year.id && f.classId === academicClass.id) map[f.feeHeadId] = String(f.amount)
    }
    return map
  }, [fees, year, academicClass])
  const [draft, setDraft] = React.useState<Record<number, string>>({})
  const key = `${year?.id}|${academicClass?.id}`
  const [draftKey, setDraftKey] = React.useState(key)
  if (draftKey !== key) {
    setDraftKey(key)
    setDraft({})
  }
  const value = (headId: number) => draft[headId] ?? saved[headId] ?? ""
  const dirty = Object.keys(draft).some((id) => (draft[Number(id)] ?? "") !== (saved[Number(id)] ?? ""))
  const invalid = heads.some((h) => {
    const v = value(h.id).trim()
    return v !== "" && !(Number(v) >= 0)
  })
  const monthly = heads
    .filter((h) => h.frequency === "Monthly")
    .reduce((sum, h) => sum + (Number(value(h.id)) || 0), 0)

  const [copying, setCopying] = React.useState(false)
  const [targets, setTargets] = React.useState<number[]>([])

  function save() {
    if (!ready || invalid) return
    const amounts = Object.fromEntries(heads.map((h) => [h.id, Number(value(h.id)) || 0]))
    const count = saveClassFees(institute.id, year.id, academicClass.id, amounts, user.name)
    setDraft({})
    toast.success("Fee setup saved successfully", {
      description: `${academicClass.name}, ${year.name}: ${count} fee head${count === 1 ? "" : "s"} with an amount.`,
    })
  }

  function copy() {
    if (!ready || !targets.length) return
    copyClassFees(institute.id, year.id, academicClass.id, targets, user.name)
    toast.success("Fee setup copied successfully", {
      description: `To ${targets.length} class${targets.length === 1 ? "" : "es"}.`,
    })
    setCopying(false)
    setTargets([])
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Fee Setup</CardTitle>
            <CardDescription>How much each fee head costs a class in an academic year.</CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/fees/heads">Manage fee heads</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeeScopeFields scope={scope} show={["year", "class"]} need={["class"]} />
        </CardContent>
      </Card>

      {ready ? (
        <Card>
          <CardHeader className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <CardTitle>
                {academicClass.name} · {year.name}
              </CardTitle>
              <CardDescription>
                Monthly total {formatAmount(monthly)}. Leave a head blank if the class doesn&apos;t pay it.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCopying(true)}
              disabled={dirty || !Object.keys(saved).length || classes.length < 2}
            >
              <CopyIcon data-icon="inline-start" />
              Copy to other classes
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-12">Sl</TableHead>
                    <TableHead>Fee head</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead className="w-48 text-right">Amount (৳)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {heads.length ? (
                    heads.map((head, index) => {
                      const v = value(head.id)
                      const bad = v.trim() !== "" && !(Number(v) >= 0)
                      return (
                        <TableRow key={head.id}>
                          <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium">{head.name}</div>
                            {head.nameBn && <div className="text-xs text-muted-foreground">{head.nameBn}</div>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{head.frequency}</Badge>
                            {head.frequency === "Per Absent Day" && (
                              <span className="ml-2 text-xs text-muted-foreground">per day fined</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              inputMode="decimal"
                              className="ml-auto w-36 text-right tabular-nums"
                              aria-label={`${head.name} amount`}
                              aria-invalid={bad}
                              placeholder="Not charged"
                              value={v}
                              onChange={(e) =>
                                setDraft((d) => ({ ...d, [head.id]: e.target.value.replace(/[^\d.]/g, "") }))
                              }
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        The institute has no active fee heads yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2 border-t">
            <Button variant="outline" onClick={() => setDraft({})} disabled={!dirty}>
              Reset
            </Button>
            <Button onClick={save} disabled={!dirty || invalid}>
              <SaveIcon data-icon="inline-start" />
              Save
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          {!institute ? "Select an institute." : !year ? "Select an academic year." : "Select a class."}
        </p>
      )}

      <Dialog open={copying} onOpenChange={setCopying}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy {academicClass?.name}&apos;s fees</DialogTitle>
            <DialogDescription>
              The picked classes get the same amounts for {year?.name}, replacing what they have.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            {classes
              .filter((c) => c.id !== academicClass?.id)
              .map((c) => (
                <Label key={c.id} className="flex items-center gap-2 font-normal">
                  <Checkbox
                    checked={targets.includes(c.id)}
                    onCheckedChange={(on) =>
                      setTargets((t) => (on ? [...t, c.id] : t.filter((id) => id !== c.id)))
                    }
                  />
                  {c.name}
                </Label>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopying(false)}>
              Cancel
            </Button>
            <Button onClick={copy} disabled={!targets.length}>
              Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
