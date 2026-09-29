import { ManageAdminList } from "@/components/institutes/academic/manage-admin-list"
import type { AcademicKind } from "@/components/institutes/academic/kinds"
import { RequireSurface } from "@/components/require-surface"
import type { AccessSurface } from "@/lib/access"

// Record kinds that live under their own module menu (Fees › Fee Head,
// Class Routine › Period) with Admin / Manage / View pages at `url`,
// `url/admin` and `url/view`. Records are added and edited on the
// institute's own form, as for Configurations.
export const moduleKinds = {
  feeHeads: { resource: "fee-head", url: "/fees/heads", title: "Fee heads" },
  routinePeriods: { resource: "routine-period", url: "/routine/periods", title: "Periods" },
  questionChapters: { resource: "question-chapter", url: "/questions/chapters", title: "Chapters & topics" },
} as const satisfies Partial<Record<AcademicKind, { resource: string; url: string; title: string }>>

export type ModuleKind = keyof typeof moduleKinds

export function KindSurface({ kind, surface }: { kind: ModuleKind; surface: AccessSurface }) {
  const { resource, url } = moduleKinds[kind]
  return (
    <RequireSurface resource={resource} surface={surface}>
      <ManageAdminList kind={kind} resource={resource} baseUrl={url} surface={surface} />
    </RequireSurface>
  )
}
