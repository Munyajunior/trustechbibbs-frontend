"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Search, ShieldCheck, UserPlus, Users } from "lucide-react";

import { ApiError } from "@/lib/api/client";
import {
  createManagedStaff,
  listManagedUsers,
  setManagedUserActive,
  updateManagedStaff,
  type ManagedStaffRole,
  type ManagedUser,
  type StaffCreatePayload,
} from "@/lib/api/user-management";
import type { Locale, Paginated } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

const staffRoles: ManagedStaffRole[] = ["editor", "registrar", "department_head", "admin"];
const initialCreate: StaffCreatePayload = {
  email: "", password: "", full_name_en: "", full_name_fr: "", role: "editor",
};

export function StaffUserManagement({ locale }: { locale: Locale }) {
  const t = useTranslations("staffUsers");
  const token = useAuthStore((state) => state.accessToken);
  const principal = useAuthStore((state) => state.user);
  const isSuper = principal?.roles.includes("super_admin") ?? false;
  const authorized = !!token && principal?.roles.some((role) => ["admin", "super_admin"].includes(role));
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");
  const [result, setResult] = useState<Paginated<ManagedUser> | null>(null);
  const [createForm, setCreateForm] = useState<StaffCreatePayload>(initialCreate);
  const [selected, setSelected] = useState<ManagedUser | null>(null);
  const [editNameEn, setEditNameEn] = useState("");
  const [editNameFr, setEditNameFr] = useState("");
  const [editRole, setEditRole] = useState<ManagedStaffRole>("editor");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryKey = `${token ?? ""}:${locale}:${search}:${role}:${activeFilter}:${page}:${refresh}`;
  const loading = loadedKey !== queryKey;

  useEffect(() => {
    if (!authorized || !token) return;
    let current = true;
    listManagedUsers(token, locale, {
      page,
      search: search || undefined,
      role: role || undefined,
      is_active: activeFilter === "" ? undefined : activeFilter === "active",
    })
      .then((data) => {
        if (!current) return;
        setResult(data);
        setError(null);
        setLoadedKey(queryKey);
      })
      .catch((caught) => {
        if (!current) return;
        setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError"));
        setLoadedKey(queryKey);
      });
    return () => { current = false; };
  }, [authorized, token, locale, search, role, activeFilter, page, refresh, queryKey, t]);

  function canManage(account: ManagedUser): boolean {
    return account.id !== principal?.id
      && account.roles.length === 1
      && staffRoles.includes(account.roles[0] as ManagedStaffRole)
      && !account.roles.includes("super_admin")
      && (isSuper || !account.roles.includes("admin"));
  }

  function selectAccount(account: ManagedUser) {
    setSelected(account);
    setEditNameEn(account.full_name_en);
    setEditNameFr(account.full_name_fr ?? "");
    setEditRole(account.roles[0] as ManagedStaffRole);
    setMessage(null);
    setError(null);
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await createManagedStaff(createForm, token, locale);
      setCreateForm(initialCreate);
      setMessage(t("created"));
      setRefresh((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function updateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selected || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateManagedStaff(selected.id, {
        full_name_en: editNameEn,
        full_name_fr: editNameFr || null,
        role: editRole,
      }, token, locale);
      setSelected(updated);
      setMessage(t("updated"));
      setRefresh((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(account: ManagedUser) {
    if (!token || busy || !canManage(account) || !window.confirm(t(account.is_active ? "confirmDeactivate" : "confirmReactivate", { name: account.full_name_en }))) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await setManagedUserActive(account.id, !account.is_active, token, locale);
      if (selected?.id === account.id) setSelected(updated);
      setMessage(t(updated.is_active ? "reactivated" : "deactivated"));
      setRefresh((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));
    } finally {
      setBusy(false);
    }
  }

  if (!authorized) return <section className="mx-auto max-w-lg px-4 py-16 text-center"><ShieldCheck className="mx-auto size-10 text-primary" aria-hidden="true" /><h1 className="mt-4 font-display text-2xl font-semibold">{t("accessTitle")}</h1><p className="mt-2 text-sm text-slate-600">{t("accessBody")}</p></section>;

  return <div className="px-4 py-8 sm:px-7 lg:px-9"><div className="mx-auto max-w-7xl space-y-7"><header><p className="text-xs font-bold uppercase tracking-[.2em] text-[#aa7c10]">{t("eyebrow")}</p><h1 className="mt-2 font-display text-3xl font-semibold text-slate-950">{t("title")}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t("intro")}</p></header>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}{message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}<div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]"><section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><Users className="size-5 text-primary" aria-hidden="true" /><h2 className="font-display text-xl font-semibold text-slate-900">{t("directory")}</h2><span className="ml-auto text-sm text-slate-500">{loading ? "…" : result?.pagination.total ?? "—"}</span></div><form onSubmit={(event) => { event.preventDefault(); setSearch(searchDraft.trim()); setPage(1); }} className="mt-5 flex gap-2"><label className="relative min-w-0 flex-1"><span className="sr-only">{t("search")}</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder={t("search")} className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500" /></label><button type="submit" className="rounded-xl bg-primary px-4 text-sm font-semibold text-white">{t("find")}</button></form><div className="mt-3 flex flex-wrap gap-3"><label className="text-xs font-semibold text-slate-600">{t("roleFilter")}<select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="">{t("allRoles")}</option>{["applicant", "student", ...staffRoles, "super_admin"].map((value) => <option key={value} value={value}>{t(`roles.${value}`)}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">{t("statusFilter")}<select value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setPage(1); }} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="">{t("allStatuses")}</option><option value="active">{t("active")}</option><option value="inactive">{t("inactive")}</option></select></label></div>{loading ? <p role="status" className="mt-6 text-sm text-slate-600">{t("loading")}</p> : !result?.items.length ? <p className="mt-6 text-sm text-slate-600">{t("empty")}</p> : <ul className="mt-5 divide-y divide-slate-100">{result.items.map((account) => <li key={account.id} className="flex flex-wrap items-center gap-3 py-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-bold text-primary">{account.full_name_en.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{locale === "fr" ? account.full_name_fr || account.full_name_en : account.full_name_en}</span><span className="block truncate text-xs text-slate-500">{account.email} · {account.roles.map((entry) => t.has(`roles.${entry}`) ? t(`roles.${entry}`) : entry).join(", ")}</span></span><span className={account.is_active ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"}>{t(account.is_active ? "active" : "inactive")}</span>{canManage(account) && <div className="flex gap-2"><button type="button" onClick={() => selectAccount(account)} className="text-xs font-semibold text-primary hover:underline">{t("edit")}</button><button type="button" onClick={() => void toggleActive(account)} disabled={busy} className="text-xs font-semibold text-slate-600 hover:text-primary disabled:opacity-50">{t(account.is_active ? "deactivate" : "reactivate")}</button></div>}</li>)}</ul>}{!loading && result && result.pagination.total_pages > 1 && <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="inline-flex items-center gap-1 text-sm font-semibold text-primary disabled:opacity-40"><ChevronLeft className="size-4" />{t("previous")}</button><span className="text-xs text-slate-600">{t("page", { page, total: result.pagination.total_pages })}</span><button type="button" onClick={() => setPage((value) => value + 1)} disabled={!result.pagination.has_next} className="inline-flex items-center gap-1 text-sm font-semibold text-primary disabled:opacity-40">{t("next")}<ChevronRight className="size-4" /></button></div>}</section><div className="space-y-6"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><UserPlus className="size-5 text-primary" aria-hidden="true" /><h2 className="font-display text-xl font-semibold">{t("createTitle")}</h2></div><p className="mt-2 text-xs leading-5 text-slate-600">{t("createNote")}</p><form onSubmit={createAccount} className="mt-5 space-y-3"><label className="block text-xs font-semibold text-slate-700">{t("nameEn")}<input required value={createForm.full_name_en} onChange={(event) => setCreateForm((value) => ({ ...value, full_name_en: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="block text-xs font-semibold text-slate-700">{t("nameFr")}<input value={createForm.full_name_fr ?? ""} onChange={(event) => setCreateForm((value) => ({ ...value, full_name_fr: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="block text-xs font-semibold text-slate-700">{t("email")}<input required type="email" value={createForm.email} onChange={(event) => setCreateForm((value) => ({ ...value, email: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="block text-xs font-semibold text-slate-700">{t("temporaryPassword")}<input required type="password" minLength={12} autoComplete="new-password" value={createForm.password} onChange={(event) => setCreateForm((value) => ({ ...value, password: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label><p className="text-xs text-slate-500">{t("passwordRule")}</p><label className="block text-xs font-semibold text-slate-700">{t("roleFilter")}<select value={createForm.role} onChange={(event) => setCreateForm((value) => ({ ...value, role: event.target.value as ManagedStaffRole }))} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">{staffRoles.filter((item) => isSuper || item !== "admin").map((item) => <option key={item} value={item}>{t(`roles.${item}`)}</option>)}</select></label><button type="submit" disabled={busy} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{t("create")}</button></form></section>{selected && canManage(selected) && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="font-display text-xl font-semibold">{t("editTitle")}</h2><p className="mt-1 truncate text-xs text-slate-500">{selected.email}</p><form onSubmit={updateAccount} className="mt-5 space-y-3"><label className="block text-xs font-semibold text-slate-700">{t("nameEn")}<input required value={editNameEn} onChange={(event) => setEditNameEn(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="block text-xs font-semibold text-slate-700">{t("nameFr")}<input value={editNameFr} onChange={(event) => setEditNameFr(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="block text-xs font-semibold text-slate-700">{t("roleFilter")}<select value={editRole} onChange={(event) => setEditRole(event.target.value as ManagedStaffRole)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">{staffRoles.filter((item) => isSuper || item !== "admin").map((item) => <option key={item} value={item}>{t(`roles.${item}`)}</option>)}</select></label><div className="flex gap-2"><button type="submit" disabled={busy} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{t("save")}</button><button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">{t("cancel")}</button></div></form></section>}</div></div></div></div>;
}
