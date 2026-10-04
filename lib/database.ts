import { httpClient } from "@/lib/http-client"

// Settings › Database: the schema plan and its execution
// (Framework/Persistence/SchemaManagement on the API; no migration files).

export type SchemaChangeRisk = "Safe" | "RequiresConfirmation" | "Destructive"

export type SchemaOperation = {
  id: string
  kind: string
  risk: SchemaChangeRisk
  table: string
  description: string
  isExecutable: boolean
  sql: string | null
}

export type SchemaPlan = {
  hash: string
  generatedAt: string
  isInSync: boolean
  canApply: boolean
  operations: SchemaOperation[]
}

export type SchemaExecuteResult = {
  executedPlanHash: string
  completedAt: string
  executedOperationCount: number
  currentPlan: SchemaPlan
}

export const fetchSchemaPlan = () => httpClient.get<SchemaPlan>("/database/schema")

export const executeSchemaPlan = (planHash: string, allowRiskyChanges: boolean, allowDestructiveChanges: boolean) =>
  httpClient.post<SchemaExecuteResult>("/database/schema/execute", { planHash, allowRiskyChanges, allowDestructiveChanges })
