"use client";

import { ArrowUpRight, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/client";
import {
  createProgramDraft,
  listEditorPrograms,
  publishProgram,
  unpublishProgram,
  updateProgramDraft,
  type EditorProgram,
  type ProgramDraftInput,
  type SchoolKey,
} from "@/lib/api/programs-editor";
import type { Locale, Pagination } from "@/lib/api/types";
import { schools } from "@/lib/schools";
import { useAuthStore } from "@/stores/auth-store";

type Props = { locale: Locale };

function value(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

export function ProgramEditor({ locale }: Props) {
  const t = useTranslations("programEditor");
  const names = useTranslations("home.schools");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const canEdit = !!token && !!user?.roles.some((role) => ["editor", "registrar", "admin", "super_admin"].includes(role));
  const canPublish = !!user?.roles.some((role) => ["registrar", "admin", "super_admin"].includes(role));
  const [records, setRecords] = useState<EditorProgram[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<EditorProgram | null>(null);
  const [draftKey, setDraftKey] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!canEdit || !token) return;
    let active = true;
    listEditorPrograms(token, locale, page)
      .then((result) => {
        if (!active) return;
        setRecords(result.items);
        setPagination(result.pagination);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("serviceUnavailable"));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [canEdit, token, locale, page, t]);

  function selectRecord(record: EditorProgram | null) {
    setSelected(record);
    setDraftKey((current) => current + 1);
    setDirty(false);
    setError(null);
    setNotice(null);
  }

  function showError(caught: unknown) {
    setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("error"));
  }

  function reflect(saved: EditorProgram) {
    setSelected(saved);
    setRecords((current) => current.some((row) => row.id === saved.id)
      ? current.map((row) => row.id === saved.id ? saved : row)
      : [saved, ...current].slice(0, 20));
    setDirty(false);
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const data = new FormData(event.currentTarget);
    const payload: ProgramDraftInput = {
      code: value(data, "code"),
      name_en: value(data, "name_en"),
      name_fr: value(data, "name_fr") || null,
      degree_level: value(data, "degree_level"),
      duration_years: Number(value(data, "duration_years")),
      school_key: value(data, "school_key") as SchoolKey,
      is_featured: data.has("is_featured"),
      description_en: value(data, "description_en") || null,
      description_fr: value(data, "description_fr") || null,
      admission_requirements_en: value(data, "admission_requirements_en") || null,
      admission_requirements_fr: value(data, "admission_requirements_fr") || null,
      career_prospects_en: value(data, "career_prospects_en") || null,
      career_prospects_fr: value(data, "career_prospects_fr") || null,
      curriculum_outline_en: value(data, "curriculum_outline_en") || null,
      curriculum_outline_fr: value(data, "curriculum_outline_fr") || null,
    };
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const saved = selected
        ? await updateProgramDraft(selected.id, payload, token, locale)
        : await createProgramDraft(payload, token, locale);
      reflect(saved);
      setNotice(t("saved"));
    } catch (caught) {
      showError(caught);
    } finally {
      setBusy(false);
    }
  }

  async function changePublication(publish: boolean) {
    if (!token || !selected || dirty) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const saved = publish
        ? await publishProgram(selected.id, token, locale)
        : await unpublishProgram(selected.id, token, locale);
      reflect(saved);
      setNotice(t(publish ? "published" : "unpublished"));
    } catch (caught) {
      showError(caught);
    } finally {
      setBusy(false);
    }
  }

  if (!canEdit) return (
    <section className="cms-access"><Container><div className="cms-access-card">
      <p className="cms-eyebrow">{t("eyebrow")}</p>
      <h1>{t("accessTitle")}</h1><p>{t("accessBody")}</p>
      <Link href="/login" className="cms-sign-in">{t("signIn")}</Link>
    </div></Container></section>
  );

  return <div className="cms-workspace"><Container>
    <div className="cms-heading">
      <div><p className="cms-eyebrow">{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("subtitle")}</p><Link className="cms-review-link" href="/staff/content">{t("contentStudio")}</Link></div>
      <Button variant="accent" onClick={() => selectRecord(null)}><Plus aria-hidden="true" />{t("newDraft")}</Button>
    </div>
    {error && <p role="alert" className="cms-feedback cms-feedback-error">{error}</p>}
    {notice && <p role="status" className="cms-feedback cms-feedback-success">{notice}</p>}
    <div className="cms-columns">
      <section className="cms-list-panel" aria-label={t("records")}> 
        <div className="cms-panel-heading"><h2>{t("records")}</h2><span>{pagination?.total ?? records.length}</span></div>
        {loading ? <p className="cms-list-empty">{t("loading")}</p> : records.length === 0 ? <p className="cms-list-empty">{t("empty")}</p> : <ul className="cms-list">
          {records.map((record) => <li key={record.id}><button type="button" className={`cms-record ${selected?.id === record.id ? "cms-record-active" : ""}`} onClick={() => selectRecord(record)}>
            <span><span className="cms-record-title">{locale === "fr" ? record.name_fr || record.name_en : record.name_en}</span><span className="program-editor-code">{record.code}</span></span>
            <span className={`cms-status ${record.published_at ? "cms-status-published" : ""}`}>{t(record.published_at ? "status.published" : "status.draft")}</span>
          </button></li>)}
        </ul>}
        {pagination && (pagination.has_previous || pagination.has_next) && <div className="cms-pagination"><button type="button" disabled={!pagination.has_previous} onClick={() => { setLoading(true); setPage((current) => current - 1); }}>{t("previous")}</button><span>{t("page", { page })}</span><button type="button" disabled={!pagination.has_next} onClick={() => { setLoading(true); setPage((current) => current + 1); }}>{t("next")}</button></div>}
      </section>
      <section className="cms-editor-panel" aria-label={t("editor")}> 
        <div className="cms-panel-heading"><h2>{selected ? t("editing", { name: selected.name_en }) : t("newDraft")}</h2>{selected && <span className={`cms-status ${selected.published_at ? "cms-status-published" : ""}`}>{t(selected.published_at ? "status.published" : "status.draft")}</span>}</div>
        <form key={`${selected?.id ?? "new"}-${draftKey}`} ref={formRef} onSubmit={onSave} onChange={() => setDirty(true)} className="cms-form">
          <div className="cms-form-grid">
            <div><Label htmlFor="program-code" required>{t("fields.code")}</Label><Input id="program-code" name="code" defaultValue={selected?.code ?? ""} readOnly={!!selected} required /></div>
            <div><Label htmlFor="program-level" required>{t("fields.level")}</Label><Input id="program-level" name="degree_level" defaultValue={selected?.degree_level ?? ""} required /></div>
            <div><Label htmlFor="program-name-en" required>{t("fields.nameEn")}</Label><Input id="program-name-en" name="name_en" defaultValue={selected?.name_en ?? ""} required /></div>
            <div><Label htmlFor="program-name-fr">{t("fields.nameFr")}</Label><Input id="program-name-fr" name="name_fr" defaultValue={selected?.name_fr ?? ""} /></div>
            <div><Label htmlFor="program-school" required>{t("fields.school")}</Label><select id="program-school" name="school_key" defaultValue={selected?.school_key ?? ""} required className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"><option value="">{t("chooseSchool")}</option>{schools.map(({ key }) => <option key={key} value={key}>{names(`${key}.title`)}</option>)}</select></div>
            <div><Label htmlFor="program-duration" required>{t("fields.duration")}</Label><Input id="program-duration" name="duration_years" type="number" min="1" max="8" defaultValue={selected?.duration_years ?? ""} required /></div>
            <label className="program-editor-featured cms-field-wide"><input type="checkbox" name="is_featured" defaultChecked={selected?.is_featured ?? false} /><span><strong>{t("fields.featured")}</strong><small>{t("fields.featuredHelp")}</small></span></label>
            <div className="cms-field-wide"><Label htmlFor="program-description-en">{t("fields.descriptionEn")}</Label><Textarea id="program-description-en" name="description_en" rows={5} defaultValue={selected?.description_en ?? ""} /></div>
            <div className="cms-field-wide"><Label htmlFor="program-description-fr">{t("fields.descriptionFr")}</Label><Textarea id="program-description-fr" name="description_fr" rows={5} defaultValue={selected?.description_fr ?? ""} /></div>
            <div className="cms-field-wide"><Label htmlFor="program-requirements-en">{t("fields.requirementsEn")}</Label><Textarea id="program-requirements-en" name="admission_requirements_en" rows={4} maxLength={5000} defaultValue={selected?.admission_requirements_en ?? ""} /></div>
            <div className="cms-field-wide"><Label htmlFor="program-requirements-fr">{t("fields.requirementsFr")}</Label><Textarea id="program-requirements-fr" name="admission_requirements_fr" rows={4} maxLength={5000} defaultValue={selected?.admission_requirements_fr ?? ""} /></div>
            <div className="cms-field-wide"><Label htmlFor="program-careers-en">{t("fields.careersEn")}</Label><Textarea id="program-careers-en" name="career_prospects_en" rows={4} maxLength={5000} defaultValue={selected?.career_prospects_en ?? ""} /></div>
            <div className="cms-field-wide"><Label htmlFor="program-careers-fr">{t("fields.careersFr")}</Label><Textarea id="program-careers-fr" name="career_prospects_fr" rows={4} maxLength={5000} defaultValue={selected?.career_prospects_fr ?? ""} /></div>
            <div className="cms-field-wide"><Label htmlFor="program-curriculum-en">{t("fields.curriculumEn")}</Label><Textarea id="program-curriculum-en" name="curriculum_outline_en" rows={5} maxLength={10000} defaultValue={selected?.curriculum_outline_en ?? ""} aria-describedby="program-curriculum-help" /><p id="program-curriculum-help" className="mt-1 text-sm text-gray-600">{t("fields.curriculumHelp")}</p></div>
            <div className="cms-field-wide"><Label htmlFor="program-curriculum-fr">{t("fields.curriculumFr")}</Label><Textarea id="program-curriculum-fr" name="curriculum_outline_fr" rows={5} maxLength={10000} defaultValue={selected?.curriculum_outline_fr ?? ""} /></div>
          </div>
          <p className="program-editor-note">{t("publicationNote")}</p>
          <div className="cms-actions">
            <Button type="submit" disabled={busy}>{busy ? t("saving") : t("save")}</Button>
            {canPublish && selected && <Button type="button" variant="accent" disabled={busy || dirty} onClick={() => void changePublication(!selected.published_at)}>{t(selected.published_at ? "unpublish" : "publish")}</Button>}
          </div>
          {selected?.published_at && selected.slug && <Link className="cms-view-link" href={`/programs/${selected.slug}`}>{t("viewPublic")}<ArrowUpRight aria-hidden="true" size={16} /></Link>}
        </form>
      </section>
    </div>
  </Container></div>;
}
