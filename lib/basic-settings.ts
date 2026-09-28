import type { AcademicKind } from "@/components/institutes/academic/kinds"

// The sidebar's Basic Settings menu, following the legacy SchoolCollege menu.
// Items with a `kind` open that kind's all-institutes "Manage (Admin)" page;
// the others (districts, user institutes) have their own static pages.
export const basicSettingsMenu: {
  title: string
  segment: string
  kind?: AcademicKind
}[] = [
  { title: "Institutes", segment: "institutes" },
  { title: "Branches", segment: "branches", kind: "branches" },
  { title: "Shifts", segment: "shifts", kind: "shifts" },
  { title: "Academic Years", segment: "years", kind: "years" },
  { title: "Academic Sessions", segment: "sessions", kind: "sessions" },
  { title: "Groups", segment: "groups", kind: "groups" },
  { title: "Academic Classes", segment: "classes", kind: "classes" },
  { title: "Sections", segment: "sections", kind: "sections" },
  { title: "Subjects", segment: "subjects", kind: "subjects" },
  { title: "Class Year Subjects", segment: "class-subjects", kind: "classSubjects" },
  { title: "Student Houses", segment: "houses", kind: "houses" },
  { title: "Student Categories", segment: "categories", kind: "categories" },
  { title: "Letter Grades", segment: "grades", kind: "grades" },
  { title: "Result Remarks", segment: "remarks", kind: "remarks" },
  { title: "Holidays & Events", segment: "holidays", kind: "holidays" },
  { title: "Buildings & Rooms", segment: "buildings", kind: "buildings" },
  { title: "Districts", segment: "districts" },
  { title: "User Institutes", segment: "user-institutes" },
]

export function basicSettingsHref(segment: string) {
  return segment === "institutes" ? "/institutes" : `/basic-settings/${segment}`
}

// Permission resource of a kind's all-institutes page (settings.classes.view).
export function basicSettingsResource(segment: string) {
  return `settings.${segment}`
}

export function basicSettingsItem(segment: string) {
  return basicSettingsMenu.find((item) => item.segment === segment && item.kind)
}
