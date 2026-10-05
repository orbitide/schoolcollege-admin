import type { AcademicKind } from "@/components/institutes/academic/kinds"

// The Basic Settings pages still kept in the admin (the sidebar shows them
// once their controllers declare them on the API, lib/navigation.ts).
// Items with a `kind` open that kind's all-institutes "Manage (Admin)" page;
// the others have their own static pages. `surfaces` marks a static page with
// Admin / Manage / View surfaces (holidays), which is permissioned like a kind.
export const basicSettingsMenu: {
  title: string
  segment: string
  kind?: AcademicKind
  surfaces?: boolean
}[] = [
  { title: "Groups", segment: "groups", kind: "groups" },
  { title: "Academic Classes", segment: "classes", kind: "classes" },
  { title: "Sections", segment: "sections", kind: "sections" },
  { title: "Subjects", segment: "subjects", kind: "subjects" },
  { title: "Class Year Subjects", segment: "class-subjects", kind: "classSubjects" },
  { title: "Letter Grades", segment: "grades", kind: "grades" },
  { title: "Holidays & Events", segment: "holidays", surfaces: true },
  { title: "Districts", segment: "districts" },
  { title: "User Institutes", segment: "user-institutes" },
]

export function basicSettingsHref(segment: string) {
  return `/basic-settings/${segment}`
}

// Permission resource of a kind's all-institutes page (settings.classes.view).
export function basicSettingsResource(segment: string) {
  return `settings.${segment}`
}

export function basicSettingsItem(segment: string) {
  return basicSettingsMenu.find((item) => item.segment === segment && item.kind)
}

// One institute's records on a section's own page (buildings live under Seat Plan).
export function instituteSettingsHref(segment: string, instituteId: number) {
  const base = segment === "buildings" ? "/seat-plans/buildings/admin" : basicSettingsHref(segment)
  return `${base}?institute=${instituteId}`
}

// Where an institute's record list lives: the section's own page when it has
// one, otherwise the institute's list page.
export function instituteListHref(segment: string, instituteId: number) {
  return segment === "buildings" || segment === "holidays" || basicSettingsItem(segment)
    ? instituteSettingsHref(segment, instituteId)
    : `/institutes/${instituteId}/${segment}`
}
