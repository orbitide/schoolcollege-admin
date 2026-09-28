"use client"

import type { AcademicClass, Institute, Section } from "@/lib/institutes"
import { getTeachers, updateTeacher, type Teacher, type TeacherSection } from "@/lib/teachers"

// Legacy SchoolCollege SectionTeacher: the TeacherSection rows seen from the
// section side — which teachers take each section of a class in a year.
// They live on the teachers (Teacher.sections), the same rows the teacher
// form's "Add Section" edits.

// The teachers taking the section in the year.
export function sectionTeachers(teachers: Teacher[], sectionId: number, yearId: number) {
  return teachers.filter(
    (t) => t.status !== "Deleted" && t.sections.some((s) => s.sectionId === sectionId && s.yearId === yearId)
  )
}

// The other way round: the sections the teacher takes in the year (legacy
// SectionTeacherService.GetSectionTeacherByTeacherId).
export function teacherSectionIds(teacher: Teacher, yearId: number) {
  return teacher.sections.filter((s) => s.yearId === yearId).map((s) => s.sectionId)
}

// The row a teacher gets for the section, built as the teacher form does:
// the structure comes from the section, medium from the class.
function sectionRow(institute: Institute, academicClass: AcademicClass, section: Section, yearId: number): TeacherSection {
  return {
    branchId: section.branchId,
    medium: institute.enableMedium ? academicClass.medium : "",
    classId: section.classId,
    version: section.version,
    yearId,
    shiftId: section.shiftId,
    gender: institute.enableSectionGender ? section.gender : "",
    groupId: section.groupId,
    sectionId: section.id,
  }
}

// Legacy AddTeacherToSection: each listed section's teachers for the year
// become exactly `teacherIds` — others lose the section, new ones gain it.
// A teacher holds a section once, so a row for another year is replaced.
// Returns how many teachers changed.
export function setSectionTeachers(
  institute: Institute,
  academicClass: AcademicClass,
  yearId: number,
  assignments: { section: Section; teacherIds: number[] }[],
  user: string
) {
  const wanted = new Map(assignments.map((a) => [a.section.id, new Set(a.teacherIds)]))
  let changed = 0
  for (const teacher of getTeachers()) {
    if (teacher.instituteId !== institute.id || teacher.status === "Deleted") continue
    let sections = teacher.sections
    for (const { section } of assignments) {
      const takes = wanted.get(section.id)!.has(teacher.id)
      const had = sections.some((s) => s.sectionId === section.id && s.yearId === yearId)
      if (takes && !had)
        sections = [
          ...sections.filter((s) => s.sectionId !== section.id),
          sectionRow(institute, academicClass, section, yearId),
        ]
      else if (!takes && had) sections = sections.filter((s) => !(s.sectionId === section.id && s.yearId === yearId))
    }
    if (sections === teacher.sections) continue
    updateTeacher(
      teacher.id,
      {
        instituteId: teacher.instituteId,
        name: teacher.name,
        teacherCode: teacher.teacherCode,
        email: teacher.email,
        mobile: teacher.mobile,
        hasAccount: teacher.hasAccount,
        subjectIds: teacher.subjectIds,
        sections,
      },
      user
    )
    changed++
  }
  return changed
}
