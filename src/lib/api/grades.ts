import { apiRequest } from "./client";
import type { Locale } from "./types";

export interface Grade {
  id: string;
  enrollment_id: string;
  student_record_id: string;
  course_id: string;
  term_id: string;
  ca_score: string | null;
  exam_score: string | null;
  total_score: string | null;
  grade: string | null;
  grade_point: string | null;
  is_pass: boolean | null;
  remarks: string | null;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "PUBLISHED";
  entered_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
}

export interface GradebookEntry {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  course_id: string;
  course_code: string;
  course_name_en: string;
  grade: Grade | null;
}

export interface PublishedResult {
  grade_id: string;
  course_id: string;
  course_code: string;
  course_name_en: string;
  course_name_fr: string | null;
  credits: number;
  academic_year: string;
  semester: number;
  ca_score: string;
  exam_score: string;
  total_score: string;
  grade: string;
  grade_point: string;
  credit_points: string;
  result_status: "PASS" | "RETAKE" | "FAIL";
}

export interface SemesterResultSummary {
  academic_year: string;
  semester: number;
  gpa: string;
  attempted_credits: number;
  earned_credits: number;
  credit_points: string;
}

export interface ResultSummary {
  student_id: string;
  student_name: string;
  results: PublishedResult[];
  semesters: SemesterResultSummary[];
  cumulative_gpa: string | null;
  credits_earned: number;
  academic_standing: "FIRST_CLASS" | "SECOND_CLASS_UPPER" | "SECOND_CLASS_LOWER" | "PROBATION" | "DISMISSAL_WARNING" | null;
}

const options = (token: string, locale: Locale) => ({ token, locale, cache: "no-store" as const });

export function getGradebook(termId: string, courseId: string, token: string, locale: Locale) {
  return apiRequest<GradebookEntry[]>("/examination/gradebook", {
    ...options(token, locale), query: { term_id: termId, course_id: courseId },
  });
}

export function saveGradeDraft(
  enrollmentId: string, caScore: number | null, examScore: number | null,
  remarks: string | null, token: string, locale: Locale,
) {
  return apiRequest<Grade>("/examination/grades/draft", {
    ...options(token, locale), method: "PUT",
    body: { enrollment_id: enrollmentId, ca_score: caScore, exam_score: examScore, remarks },
  });
}

export function transitionGrade(
  gradeId: string, action: "submit" | "approve" | "publish", token: string, locale: Locale,
) {
  return apiRequest<Grade>(`/examination/grades/${gradeId}/${action}`, {
    ...options(token, locale), method: "POST",
  });
}

export function getMyResults(token: string, locale: Locale) {
  return apiRequest<ResultSummary>("/students/me/results", options(token, locale));
}
