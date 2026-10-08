"use client";

import Image from "next/image";
import { Mail, Phone, Search, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type { LeadershipProfile, Locale } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { publicMediaSrc } from "@/lib/public-media";

export function LeadershipDirectory({ profiles, locale }: { profiles: LeadershipProfile[]; locale: Locale }) {
  const t = useTranslations("leadership");
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const departments = useMemo(() => Array.from(new Set(
    profiles.map((profile) => localizedField(profile, "department", locale)).filter(Boolean),
  )).sort((a, b) => a.localeCompare(b, locale)), [profiles, locale]);
  const search = query.trim().toLocaleLowerCase(locale);
  const matches = profiles.filter((profile) => {
    const profileDepartment = localizedField(profile, "department", locale);
    const text = [profile.name, localizedField(profile, "title", locale), profileDepartment]
      .join(" ").toLocaleLowerCase(locale);
    return (!department || profileDepartment === department) && (!search || text.includes(search));
  });
  const byManager = new Map<string | null, LeadershipProfile[]>();
  for (const profile of profiles) {
    const parent = profile.reports_to_id && profiles.some((entry) => entry.id === profile.reports_to_id)
      ? profile.reports_to_id : null;
    byManager.set(parent, [...(byManager.get(parent) ?? []), profile]);
  }
  function branch(parentId: string | null, seen: Set<string>): React.ReactNode {
    const children = (byManager.get(parentId) ?? []).filter((profile) => !seen.has(profile.id));
    if (!children.length) return null;
    return <ol className="leadership-tree">{children.map((profile) => {
      const next = new Set(seen); next.add(profile.id);
      return <li key={profile.id}><div className="leadership-tree-node"><strong>{profile.name}</strong><span>{localizedField(profile, "title", locale)}</span></div>{branch(profile.id, next)}</li>;
    })}</ol>;
  }

  return <>
    {profiles.length > 0 && <>
      <div className="leadership-filters">
        <label><span>{t("searchLabel")}</span><span className="leadership-input-wrap"><Search aria-hidden="true" size={18} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} /></span></label>
        <label><span>{t("departmentLabel")}</span><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">{t("allDepartments")}</option>{departments.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
      </div>
      <p className="leadership-count" role="status">{t("results", { count: matches.length })}</p>
      {matches.length ? <div className="leadership-grid">{matches.map((profile) => {
        const photo = publicMediaSrc(profile.photo_url);
        return <article className="leadership-card" key={profile.id}>
          <div className="leadership-photo">{photo ? <Image src={photo} alt={profile.name} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" className="object-cover" /> : <UserRound aria-hidden="true" size={60} />}</div>
          <div className="leadership-card-body"><p className="leadership-department">{localizedField(profile, "department", locale)}</p><h2>{profile.name}</h2><p className="leadership-title">{localizedField(profile, "title", locale)}</p><p className="leadership-bio">{localizedField(profile, "biography", locale)}</p>
            <div className="leadership-contact">{profile.email && <a href={`mailto:${profile.email}`}><Mail aria-hidden="true" size={16} />{profile.email}</a>}{profile.phone && <a href={`tel:${profile.phone.replace(/[^+\d]/g, "")}`}><Phone aria-hidden="true" size={16} />{profile.phone}</a>}</div>
          </div>
        </article>;
      })}</div> : <p className="leadership-no-results">{t("noResults")}</p>}
      {!search && !department && <section className="leadership-governance" aria-labelledby="governance-title"><h2 id="governance-title">{t("governanceTitle")}</h2><p>{t("governanceIntro")}</p>{branch(null, new Set())}</section>}
    </>}
  </>;
}
