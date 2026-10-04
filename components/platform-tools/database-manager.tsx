"use client"

import * as React from "react"
import { toast } from "sonner"

import { CheckField } from "@/components/settings/settings-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { executeSchemaPlan, fetchSchemaPlan, type SchemaChangeRisk, type SchemaPlan } from "@/lib/database"

const riskBadge: Record<SchemaChangeRisk, { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  Safe: { label: "Safe", variant: "secondary" },
  RequiresConfirmation: { label: "Needs confirmation", variant: "outline" },
  Destructive: { label: "Destructive", variant: "destructive" },
}

// Compares the API's model with the live database and applies the difference. Safe changes
// run as they are; the others each need their own confirmation.
export function DatabaseManager() {
  const [plan, setPlan] = React.useState<SchemaPlan>()
  const [error, setError] = React.useState<string>()
  const [busy, setBusy] = React.useState(false)
  const [allowRisky, setAllowRisky] = React.useState(false)
  const [allowDestructive, setAllowDestructive] = React.useState(false)

  const inspect = React.useCallback(async () => {
    setBusy(true)
    setError(undefined)
    try {
      setPlan(await fetchSchemaPlan())
      setAllowRisky(false)
      setAllowDestructive(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }, [])

  React.useEffect(() => {
    let active = true
    fetchSchemaPlan().then(
      (loaded) => active && setPlan(loaded),
      (e: Error) => active && setError(e.message)
    )
    return () => {
      active = false
    }
  }, [])

  const operations = plan?.operations ?? []
  const hasRisky = operations.some((op) => op.risk === "RequiresConfirmation")
  const hasDestructive = operations.some((op) => op.risk === "Destructive")
  const canExecute =
    !!plan && !plan.isInSync && plan.canApply && (!hasRisky || allowRisky) && (!hasDestructive || allowDestructive)

  async function execute() {
    if (!plan) return
    setBusy(true)
    try {
      const result = await executeSchemaPlan(plan.hash, allowRisky, allowDestructive)
      setPlan(result.currentPlan)
      setAllowRisky(false)
      setAllowDestructive(false)
      toast.success(`Applied ${result.executedOperationCount} operation(s).`)
    } catch (e) {
      toast.error((e as Error).message)
      await inspect()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Database schema
          {plan && (
            <Badge variant={plan.isInSync ? "secondary" : "destructive"}>
              {plan.isInSync ? "In sync" : `${operations.length} pending operation(s)`}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          The tables the API needs, compared with the live database. Review the changes, then execute them.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {plan?.isInSync && <p className="text-sm text-muted-foreground">Nothing to change.</p>}
        {plan && !plan.canApply && (
          <p className="text-sm text-destructive">
            Some changes cannot be applied automatically. Fix them in the model or the database, then inspect again.
          </p>
        )}

        {operations.map((op) => (
          <div key={op.id} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={riskBadge[op.risk].variant}>{riskBadge[op.risk].label}</Badge>
              {!op.isExecutable && <Badge variant="destructive">Manual fix needed</Badge>}
              <span className="text-sm font-medium">{op.description}</span>
            </div>
            {op.sql && (
              <details className="mt-2" open={op.risk === "Destructive"}>
                <summary className="cursor-pointer text-xs text-muted-foreground">SQL</summary>
                <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-xs">{op.sql}</pre>
              </details>
            )}
          </div>
        ))}

        {hasRisky && (
          <CheckField
            label="I reviewed the changes that need confirmation"
            description="Adding required columns, keys or unique indexes can fail on existing data."
            checked={allowRisky}
            onChange={setAllowRisky}
          />
        )}
        {hasDestructive && (
          <div className="rounded-lg border border-destructive/50 p-3">
            <CheckField
              label="I want to permanently drop the destructive items"
              description="Their data is deleted and can't be recovered."
              checked={allowDestructive}
              onChange={setAllowDestructive}
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => void inspect()} disabled={busy}>
          Inspect again
        </Button>
        <Button onClick={() => void execute()} disabled={busy || !canExecute}>
          Execute {operations.length > 0 ? `${operations.length} operation(s)` : ""}
        </Button>
      </CardFooter>
    </Card>
  )
}
