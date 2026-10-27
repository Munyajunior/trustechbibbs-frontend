"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight, BarChart3, BookOpen, CalendarDays, CheckCircle2, ClipboardList,
  FileCheck2, FileText, GraduationCap, Image, Images, Inbox, Megaphone, RefreshCw, ShieldCheck,
  Users, type LucideIcon,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { listCourses } from "@/lib/api/academic-catalogue";
import { getApplicationsForReview, getEnrollmentSummary, type ReviewApplicationListItem } from "@/lib/api/admissions";
import { getEditorPublicationSummary, type EditorPublicationSummary } from "@/lib/api/cms";
import { listEnquiries } from "@/lib/api/enquiries";
import { listEditorPrograms } from "@/lib/api/programs-editor";
import { listStaffTranscriptRequests } from "@/lib/api/transcripts";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

type DashboardData = {
  submitted: number | null;
  students: number | null;
  enquiries: number | null;
  transcripts: number | null;
  programs: number | null;
  courses: number | null;
  news: number | null;
  events: number | null;
  publication: EditorPublicationSummary | null;
  applications: ReviewApplicationListItem[];
  pipeline: Record<string, number | null>;
  byProgram: Array<{ id: string; name: string; count: number }>;
};

type Action = { key: string; href: string; icon: LucideIcon };
type Metric = Action & { value: number | null; tone: "blue" | "gold" | "violet" };

const pipelineStages = ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW", "ADMITTED"] as const;
const empty: DashboardData = {
  submitted: null, students: null, enquiries: null, transcripts: null, programs: null,
  courses: null, news: null, events: null, publication: null, applications: [], pipeline: {}, byProgram: [],
};

export function StaffDashboard({ locale }: { locale: Locale }) {
  const t = useTranslations("staffDashboard");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const canReview = roles.some((role) => ["registrar", "admin", "super_admin"].includes(role));
  const canEdit = roles.some((role) => ["editor", "admin", "super_admin"].includes(role));
  const canPrograms = roles.some((role) => ["editor", "registrar", "admin", "super_admin"].includes(role));
  const canCourses = roles.some((role) => ["registrar", "department_head", "admin", "super_admin"].includes(role));
  const canAudit = roles.some((role) => ["admin", "super_admin"].includes(role));
  const [data, setData] = useState<DashboardData>(empty);
  const [loadedKey, setLoadedKey] = useState("");
  const [partial, setPartial] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [refresh, setRefresh] = useState(0);
  const requestKey = `${token ?? ""}:${locale}:${canReview}:${canEdit}:${canPrograms}:${canCourses}:${refresh}`;
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    if (!token) return;
    let active = true;
    const calls: Promise<unknown>[] = [];
    if (canReview) {
      calls.push(
        getApplicationsForReview(token, locale, "SUBMITTED"),
        getEnrollmentSummary(token, locale),
        listEnquiries(token, locale, 1, "NEW"),
        listStaffTranscriptRequests(token, locale, 1, "REQUESTED"),
      );
      for (const stage of pipelineStages.slice(1)) calls.push(getApplicationsForReview(token, locale, stage, 1));
    }
    if (canPrograms) calls.push(listEditorPrograms(token, locale, 1, 1));
    if (canCourses) calls.push(listCourses(token, locale, 1, undefined, 1));
    if (canEdit) calls.push(getEditorPublicationSummary(token, locale));

    Promise.allSettled(calls).then((results) => {
      if (!active) return;
      const next: DashboardData = { ...empty };
      let index = 0;
      const read = <T,>(): T | null => {
        const result = results[index++];
        return result?.status === "fulfilled" ? result.value as T : null;
      };
      if (canReview) {
        const applications = read<Awaited<ReturnType<typeof getApplicationsForReview>>>();
        const enrollments = read<Awaited<ReturnType<typeof getEnrollmentSummary>>>();
        const enquiries = read<Awaited<ReturnType<typeof listEnquiries>>>();
        next.submitted = applications?.pagination.total ?? null;
        next.applications = applications?.items.slice(0, 4) ?? [];
        next.students = enrollments?.total_active ?? null;
        next.enquiries = enquiries?.pagination.total ?? null;
        next.transcripts = read<Awaited<ReturnType<typeof listStaffTranscriptRequests>>>()?.pagination.total ?? null;
        next.byProgram = enrollments?.by_program.map((entry) => ({
          id: entry.program_id ?? "unassigned",
          name: (locale === "fr" ? entry.program_name_fr : entry.program_name_en)
            || entry.program_name_en || entry.program_code || t("unassigned"),
          count: entry.active_students,
        })).sort((a, b) => b.count - a.count).slice(0, 5) ?? [];
        next.pipeline.SUBMITTED = next.submitted;
        for (const stage of pipelineStages.slice(1)) {
          next.pipeline[stage] = read<Awaited<ReturnType<typeof getApplicationsForReview>>>()?.pagination.total ?? null;
        }
      }
      if (canPrograms) next.programs = read<Awaited<ReturnType<typeof listEditorPrograms>>>()?.pagination.total ?? null;
      if (canCourses) next.courses = read<Awaited<ReturnType<typeof listCourses>>>()?.pagination.total ?? null;
      if (canEdit) {
        next.publication = read<EditorPublicationSummary>();
        next.news = next.publication ? Object.values(next.publication.news).reduce((sum, count) => sum + count, 0) : null;
        next.events = next.publication ? Object.values(next.publication.events).reduce((sum, count) => sum + count, 0) : null;
      }
      setData(next);
      setPartial(results.some((result) => result.status === "rejected"));
      setRefreshedAt(new Date());
      setLoadedKey(requestKey);
    });
    return () => { active = false; };
  }, [token, canReview, canEdit, canPrograms, canCourses, locale, refresh, requestKey, t]);

  const actions: Action[] = [
    canReview && { key: "review", href: "/staff/admissions", icon: ClipboardList },
    canReview && { key: "reply", href: "/staff/enquiries", icon: Inbox },
    canReview && { key: "transcripts", href: "/staff/transcripts", icon: FileCheck2 },
    canPrograms && { key: "managePrograms", href: "/staff/programs", icon: GraduationCap },
    canCourses && { key: "manageCourses", href: "/staff/courses", icon: BookOpen },
    canReview && { key: "grades", href: "/staff/grades", icon: BarChart3 },
    canReview && { key: "schedule", href: "/staff/scheduling", icon: CalendarDays },
    canEdit && { key: "publish", href: "/staff/content", icon: FileText },
    canEdit && { key: "gallery", href: "/staff/gallery", icon: Images },
    canEdit && { key: "media", href: "/staff/media", icon: Image },
    canEdit && { key: "banners", href: "/staff/banners", icon: Megaphone },
    canEdit && { key: "leadership", href: "/staff/leadership", icon: Users },
    canAudit && { key: "staffUsers", href: "/staff/users", icon: Users },
    canAudit && { key: "audit", href: "/staff/audit", icon: ShieldCheck },
  ].filter((action): action is Action => !!action);

  const queues: Metric[] = canReview ? [
    { key: "submitted", value: data.submitted, href: "/staff/admissions", icon: ClipboardList, tone: "blue" },
    { key: "enquiries", value: data.enquiries, href: "/staff/enquiries", icon: Inbox, tone: "gold" },
    { key: "transcripts", value: data.transcripts, href: "/staff/transcripts", icon: FileCheck2, tone: "violet" },
  ] : [];
  const metrics: Metric[] = [
    canReview && { key: "students", value: data.students, href: "/staff/admissions", icon: Users, tone: "blue" },
    canPrograms && { key: "programs", value: data.programs, href: "/staff/programs", icon: GraduationCap, tone: "violet" },
    canCourses && { key: "courses", value: data.courses, href: "/staff/courses", icon: BookOpen, tone: "gold" },
    canEdit && { key: "news", value: data.news, href: "/staff/content", icon: FileText, tone: "blue" },
    canEdit && { key: "events", value: data.events, href: "/staff/content", icon: CalendarDays, tone: "violet" },
  ].filter((metric): metric is Metric => !!metric);
  const allQueuesKnown = queues.every((queue) => queue.value !== null);
  const pending = queues.reduce((total, queue) => total + (queue.value ?? 0), 0);
  const maxPipeline = Math.max(1, ...Object.values(data.pipeline).filter((value): value is number => typeof value === "number"));
  const maxProgram = Math.max(1, ...data.byProgram.map((program) => program.count));
  const valueText = (value: number | null) => loading ? "…" : value === null ? "—" : new Intl.NumberFormat(locale).format(value);

  return <main className="min-w-0 px-4 py-6 sm:px-7 lg:px-9 lg:py-8">
    <div className="mx-auto max-w-[1400px] space-y-7">
      <header className="relative isolate overflow-hidden rounded-[28px] bg-[#071f5c] p-6 text-white shadow-[0_20px_60px_-28px_rgba(3,24,69,.75)] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_84%_18%,rgba(246,195,39,.28),transparent_28%),radial-gradient(circle_at_56%_130%,rgba(43,111,242,.52),transparent_48%)]" />
        <div className="pointer-events-none absolute -right-20 -top-32 -z-10 size-[420px] rounded-full border-[70px] border-white/[.055]" />
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[.24em] text-[#f7d16a]">{t("eyebrow")}</p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{t("welcome", { name: user?.full_name?.split(" ")[0] || t("colleague") })}</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-100 sm:text-base">{t("intro")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions.slice(0, 2).map((action) => <Link key={action.key} href={action.href} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#092c80] shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{t(`shortcuts.${action.key}`)}<ArrowRight className="size-4" aria-hidden="true" /></Link>)}
            <button type="button" onClick={() => setRefresh((value) => value + 1)} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />{t("refresh")}</button>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500" role="status" aria-live="polite">
        <span className="inline-flex items-center gap-2"><span className={`size-2 rounded-full ${partial ? "bg-amber-500" : "bg-emerald-500"}`} />{loading ? t("loading") : partial ? t("partialStatus") : t("liveData")}</span>
        {refreshedAt && <span>{t("updatedAt", { time: new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(refreshedAt) })}</span>}
      </div>
      {partial && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">{t("partialData")}</div>}

      {canReview && <section aria-labelledby="staff-priorities-heading" className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_38px_-28px_rgba(14,37,84,.35)] sm:p-7">
        <SectionHeading eyebrow={t("priority")} title={t("actionCentre")} id="staff-priorities-heading" description={t("actionCentreHint")} trailing={!loading && allQueuesKnown ? t("knownPending", { count: pending }) : undefined} />
        <div className="mt-5 grid gap-3 md:grid-cols-3">{queues.map((queue) => <MetricCard key={queue.key} metric={queue} label={t(`metrics.${queue.key}`)} value={valueText(queue.value)} prominent />)}</div>
        {!loading && allQueuesKnown && pending === 0 && <p className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 className="size-4" aria-hidden="true" />{t("allCaughtUp")}</p>}
      </section>}

      <section aria-labelledby="staff-metrics-heading">
        <SectionHeading eyebrow={t("pulse")} title={t("atGlance")} id="staff-metrics-heading" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{metrics.map((metric) => <MetricCard key={metric.key} metric={metric} label={t(`metrics.${metric.key}`)} value={valueText(metric.value)} />)}</div>
      </section>

      {canReview && <section aria-labelledby="staff-analytics-heading" className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <SectionHeading eyebrow={t("analytics")} title={t("admissionsPipeline")} id="staff-analytics-heading" description={t("pipelineNote")} />
          <div className="mt-7 space-y-5">{pipelineStages.map((stage) => { const value = data.pipeline[stage] ?? null; return <div key={stage}>
            <div className="mb-2 flex justify-between gap-3 text-sm"><span className="font-medium text-slate-700">{t(`pipeline.${stage}`)}</span><span className="font-semibold tabular-nums text-slate-900">{valueText(value)}</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${t(`pipeline.${stage}`)}: ${valueText(value)}`}><div className="h-full rounded-full bg-gradient-to-r from-[#123ca8] to-[#5187ef] transition-[width] duration-500" style={{ width: `${value === null ? 0 : (value / maxPipeline) * 100}%` }} /></div>
          </div>; })}</div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <SectionHeading eyebrow={t("analytics")} title={t("studentsByProgram")} description={t("programNote")} />
          {data.byProgram.length ? <div className="mt-7 space-y-5">{data.byProgram.map((program) => <div key={program.id}>
            <div className="mb-2 flex justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium text-slate-700" title={program.name}>{program.name}</span><span className="font-semibold tabular-nums text-slate-900">{new Intl.NumberFormat(locale).format(program.count)}</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${program.name}: ${program.count}`}><div className="h-full rounded-full bg-gradient-to-r from-[#edb91e] to-[#f8d968] transition-[width] duration-500" style={{ width: `${(program.count / maxProgram) * 100}%` }} /></div>
          </div>)}</div> : <div className="mt-7 flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">{loading ? t("loading") : data.students === null ? t("unavailable") : t("noStudentData")}</div>}
        </div>
      </section>}

      {canEdit && <section aria-labelledby="staff-publication-heading" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <SectionHeading eyebrow={t("websitePulse")} title={t("publicationOverview")} id="staff-publication-heading" description={t("publicationNote")} />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">{(["news", "events"] as const).map((kind) => {
          const counts = data.publication?.[kind];
          return <Link key={kind} href="/staff/content" className="group rounded-2xl border border-slate-200 bg-[#f8faff] p-5 transition hover:border-blue-200 hover:bg-white hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <div className="flex items-center justify-between gap-3"><h3 className="font-display text-lg font-semibold text-slate-900">{t(`publication.${kind}`)}</h3><ArrowRight className="size-4 text-slate-400 group-hover:text-primary" aria-hidden="true" /></div>
            <div className="mt-5 grid grid-cols-3 gap-2">{(["draft", "scheduled", "published"] as const).map((status) => <div key={status} className="rounded-xl bg-white p-3 text-center shadow-sm"><p className="text-xl font-semibold tabular-nums text-[#123ca8]">{valueText(counts?.[status] ?? null)}</p><p className="mt-1 text-xs text-slate-600">{t(`publication.${status}`)}</p></div>)}</div>
          </Link>;
        })}</div>
        <p className="mt-4 text-xs text-slate-500">{t("publicationArchiveNote")}</p>
      </section>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)]">
        <section aria-labelledby="staff-actions-heading" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <SectionHeading eyebrow={t("workbench")} title={t("quickActions")} id="staff-actions-heading" />
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">{actions.map((action) => <Link key={action.key} href={action.href} className="group flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-[#f8faff] p-3.5 transition hover:-translate-y-0.5 hover:border-[#b7c9f5] hover:bg-white hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-[#123ca8] shadow-sm"><action.icon className="size-[19px]" aria-hidden="true" /></span><span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{t(`shortcuts.${action.key}`)}</span><ArrowRight className="size-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" /></Link>)}</div>
        </section>
        <section aria-labelledby="staff-queue-heading" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <SectionHeading eyebrow={t("priority")} title={canReview ? t("admissionsQueue") : t("yourWorkspace")} id="staff-queue-heading" />
          {canReview ? <>{data.applications.length ? <ul className="mt-4 divide-y divide-slate-100">{data.applications.map((application) => <li key={application.id} className="flex items-center justify-between gap-3 py-3.5"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{application.reference_number}</p><p className="mt-1 text-xs text-slate-500">{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(application.created_at))}</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">{t("awaitingReview")}</span></li>)}</ul> : <p className="mt-6 text-sm text-slate-600">{loading ? t("loading") : data.submitted === null ? t("unavailable") : t("queueClear")}</p>}<Link href="/staff/admissions" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">{t("openQueue")}<ArrowRight className="size-4" aria-hidden="true" /></Link></> : <><p className="mt-5 text-sm leading-relaxed text-slate-600">{t("workspaceHint")}</p><Link href={actions[0]?.href ?? "/"} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">{t("startWorking")}<ArrowRight className="size-4" aria-hidden="true" /></Link></>}
        </section>
      </div>
    </div>
  </main>;
}

function SectionHeading({ eyebrow, title, description, trailing, id }: { eyebrow: string; title: string; description?: string; trailing?: string; id?: string }) {
  return <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#a8740b]">{eyebrow}</p><h2 id={id} className="mt-1 font-display text-xl font-semibold tracking-tight text-slate-950 sm:text-[22px]">{title}</h2>{description && <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">{description}</p>}</div>{trailing && <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">{trailing}</span>}</div>;
}

function MetricCard({ metric, label, value, prominent = false }: { metric: Metric; label: string; value: string; prominent?: boolean }) {
  const tone = metric.tone === "gold" ? "bg-amber-50 text-amber-700" : metric.tone === "violet" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700";
  return <Link href={metric.href} className={`group flex min-w-0 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${prominent ? "min-h-36 bg-[#fafbfe] sm:p-5" : "min-h-32"}`}><div className="flex items-start justify-between"><span className={`grid size-10 place-items-center rounded-xl ${tone}`}><metric.icon className="size-5" aria-hidden="true" /></span><ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" /></div><div className="mt-4"><p className="text-3xl font-semibold tabular-nums tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs font-medium leading-snug text-slate-600 sm:text-sm">{label}</p></div></Link>;
}
