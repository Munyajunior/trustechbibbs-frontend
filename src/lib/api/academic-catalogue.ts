import { apiList, apiRequest } from "./client";
import type { Locale, Paginated } from "./types";

export interface School {
  id: string;
  campus_id: string;
  key: string;
  code: string;
  name_en: string;
  name_fr: string;
  is_active: boolean;
}

export interface Department {
  id: string;
  school_id: string;
  code: string;
  name_en: string;
  name_fr: string;
  description_en: string | null;
  description_fr: string | null;
  is_active: boolean;
}

export interface Course {
  id: string;
  department_id: string;
  course_code: string;
  name_en: string;
  name_fr: string | null;
  credits: number;
  contact_hours_lecture: number;
  contact_hours_tutorial: number;
  contact_hours_practical: number;
  level: number;
  semester: number;
  course_type: "CORE" | "ELECTIVE" | "GENERAL_STUDIES" | "REMEDIAL";
  status: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
  description_en: string | null;
  description_fr: string | null;
  learning_objectives_en: string | null;
  learning_objectives_fr: string | null;
  syllabus_url: string | null;
}

export interface CurriculumCourse {
  course: Course;
  placement: { level: number; semester: number; is_required: boolean };
}

type CourseInput = Omit<Course, "id" | "status" | "description_en" | "description_fr" | "learning_objectives_en" | "learning_objectives_fr" | "syllabus_url"> & {
  description_en?: string | null;
  description_fr?: string | null;
  learning_objectives_en?: string | null;
  learning_objectives_fr?: string | null;
  syllabus_url?: string | null;
};

export function listSchools(token: string, locale: Locale) {
  return apiRequest<School[]>("/academic/schools", { token, locale, cache: "no-store" });
}

export function listDepartments(token: string, locale: Locale, schoolId?: string) {
  return apiRequest<Department[]>("/academic/departments", {
    token, locale, query: { school_id: schoolId }, cache: "no-store",
  });
}

export function createDepartment(
  payload: Pick<Department, "school_id" | "code" | "name_en" | "name_fr">,
  token: string, locale: Locale,
) {
  return apiRequest<Department>("/academic/departments", {
    method: "POST", body: payload, token, locale, cache: "no-store",
  });
}

export function listCourses(token: string, locale: Locale, page = 1, departmentId?: string, perPage = 20) {
  return apiList<Course>("/academic/courses", {
    token, locale, query: { page, per_page: perPage, department_id: departmentId },
    cache: "no-store",
  }) as Promise<Paginated<Course>>;
}

export async function listAllCourses(token: string, locale: Locale): Promise<Course[]> {
  const records: Course[] = [];
  let page = 1;
  for (;;) {
    const result = await listCourses(token, locale, page, undefined, 100);
    records.push(...result.items);
    if (!result.pagination.has_next) return records;
    page += 1;
  }
}

export interface CoursePrerequisite {
  course_id: string;
  prerequisite_id: string;
  is_corequisite: boolean;
  minimum_grade: "A" | "B+" | "B" | "C+" | "C" | "D" | null;
}

export function listCoursePrerequisites(courseId: string, token: string, locale: Locale) {
  return apiRequest<CoursePrerequisite[]>(`/academic/courses/${courseId}/prerequisites`, {
    token, locale, cache: "no-store",
  });
}

export function assignCoursePrerequisite(
  courseId: string, prerequisiteId: string,
  payload: Pick<CoursePrerequisite, "is_corequisite" | "minimum_grade">,
  token: string, locale: Locale,
) {
  return apiRequest<CoursePrerequisite>(`/academic/courses/${courseId}/prerequisites/${prerequisiteId}`, {
    method: "PUT", body: payload, token, locale, cache: "no-store",
  });
}

export function removeCoursePrerequisite(
  courseId: string, prerequisiteId: string, token: string, locale: Locale,
) {
  return apiRequest<{ removed: boolean }>(`/academic/courses/${courseId}/prerequisites/${prerequisiteId}`, {
    method: "DELETE", token, locale, cache: "no-store",
  });
}

export function createCourse(payload: CourseInput, token: string, locale: Locale) {
  return apiRequest<Course>("/academic/courses", {
    method: "POST", body: payload, token, locale, cache: "no-store",
  });
}

export function updateCourse(id: string, payload: Partial<CourseInput> & { status?: Course["status"] }, token: string, locale: Locale) {
  return apiRequest<Course>(`/academic/courses/${id}`, {
    method: "PATCH", body: payload, token, locale, cache: "no-store",
  });
}

export function assignProgramDepartment(
  programId: string, departmentId: string, token: string, locale: Locale,
) {
  return apiRequest<{ department_id: string }>(`/academic/programs/${programId}/department`, {
    method: "PUT", body: { department_id: departmentId }, token, locale,
    cache: "no-store",
  });
}

export function assignProgramCourse(
  programId: string, courseId: string,
  placement: CurriculumCourse["placement"], token: string, locale: Locale,
) {
  return apiRequest<CurriculumCourse>(`/academic/programs/${programId}/courses/${courseId}`, {
    method: "PUT", body: placement, token, locale, cache: "no-store",
  });
}

export function listProgramCurriculum(programId: string, token: string, locale: Locale) {
  return apiRequest<CurriculumCourse[]>(`/academic/programs/${programId}/curriculum`, {
    token, locale, cache: "no-store",
  });
}

export function getPublicCurriculum(slug: string, locale: Locale) {
  return apiRequest<CurriculumCourse[]>(`/public/programs/${encodeURIComponent(slug)}/curriculum`, {
    locale, cache: "no-store",
  });
}
