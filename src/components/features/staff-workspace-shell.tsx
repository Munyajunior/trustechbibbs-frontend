"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BarChart3, BookOpen, CalendarDays, ClipboardList, FileCheck2, FileText, GraduationCap,
  Image, Images, Inbox, LayoutDashboard, Menu, Megaphone, Search, ShieldCheck, Users, X,
  type LucideIcon,
} from "lucide-react";

import { BrandMark } from "@/components/layout/brand-mark";
import { StaffPasswordChange } from "@/components/features/staff-password-change";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

type StaffRole = "editor" | "registrar" | "department_head" | "admin" | "super_admin";
type NavItem = { href: string; key: string; icon: LucideIcon; roles: StaffRole[] };

const A: StaffRole[] = ["admin", "super_admin"];
const R: StaffRole[] = ["registrar", ...A];
const E: StaffRole[] = ["editor", ...A];
const C: StaffRole[] = ["registrar", "department_head", ...A];
const P: StaffRole[] = ["editor", "registrar", ...A];
const groups: { key: string; items: NavItem[] }[] = [
  { key: "overview", items: [{ href: "/staff", key: "dashboard", icon: LayoutDashboard, roles: ["editor", "registrar", "department_head", ...A] }] },
  { key: "operations", items: [
    { href: "/staff/admissions", key: "admissions", icon: ClipboardList, roles: R },
    { href: "/staff/enquiries", key: "enquiries", icon: Inbox, roles: R },
    { href: "/staff/programs", key: "programs", icon: GraduationCap, roles: P },
    { href: "/staff/courses", key: "courses", icon: BookOpen, roles: C },
    { href: "/staff/scheduling", key: "scheduling", icon: CalendarDays, roles: R },
    { href: "/staff/grades", key: "grades", icon: BarChart3, roles: R },
    { href: "/staff/transcripts", key: "transcripts", icon: FileCheck2, roles: R },
  ] },
  { key: "website", items: [
    { href: "/staff/content", key: "content", icon: FileText, roles: E },
    { href: "/staff/gallery", key: "gallery", icon: Images, roles: E },
    { href: "/staff/media", key: "media", icon: Image, roles: E },
    { href: "/staff/banners", key: "banners", icon: Megaphone, roles: E },
    { href: "/staff/leadership", key: "leadership", icon: Users, roles: E },
  ] },
  { key: "governance", items: [
    { href: "/staff/users", key: "users", icon: Users, roles: A },
    { href: "/staff/audit", key: "audit", icon: ShieldCheck, roles: A },
  ] },
];

export function StaffWorkspaceShell({ children }: { children: ReactNode }) {
  const t = useTranslations("staffDashboard");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const authorized = !!token && roles.some((role) => ["editor", "registrar", "department_head", "admin", "super_admin"].includes(role));
  const currentItem = groups.flatMap((group) => group.items).find((item) =>
    (pathname === item.href || (item.href !== "/staff" && pathname.startsWith(`${item.href}/`))) &&
    item.roles.some((role) => roles.includes(role)),
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (window.matchMedia("(max-width: 1023px)").matches) setMobileOpen(true);
        window.requestAnimationFrame(() => searchRef.current?.focus());
      }
      if (event.key === "Escape") {
        setMobileOpen(false);
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!authorized) return <div className="min-h-[60vh] bg-[#f4f6fb] px-4 py-16"><section className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50"><ShieldCheck className="mx-auto size-10 text-primary" aria-hidden="true" /><h1 className="mt-5 font-display text-2xl font-semibold">{t("accessTitle")}</h1><p className="mt-3 text-sm text-slate-600">{t("accessBody")}</p><Link href="/login" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white">{t("signIn")}</Link></section></div>;
  if (user?.must_change_password) return <StaffPasswordChange locale={locale} />;

  const nav = (mobile: boolean) => <><div className="border-b border-white/10 px-5 py-5"><Link href="/staff" onClick={() => setMobileOpen(false)} className="block rounded-xl bg-white p-2 shadow-sm"><BrandMark compact /></Link><p className="mt-4 px-1 text-[11px] font-semibold uppercase tracking-[.19em] text-blue-200">{t("workspace")}</p><label className="relative mt-5 block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-blue-200" aria-hidden="true" /><span className="sr-only">{t("searchNavigation")}</span><input ref={mobile === mobileOpen ? searchRef : undefined} type="search" value={navQuery} onChange={(event) => setNavQuery(event.target.value)} placeholder={t("searchNavigation")} className="w-full rounded-xl border border-white/15 bg-white/10 py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-blue-200/75 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30" /></label><p className="mt-2 px-1 text-[11px] text-blue-200/75">{t("navigationShortcut")}</p></div><nav aria-label={t("navigation")} className="space-y-6 px-3 py-5">{groups.map((group) => {
    const items = group.items.filter((item) => item.roles.some((role) => roles.includes(role)) && t(`nav.${item.key}`).toLocaleLowerCase().includes(navQuery.trim().toLocaleLowerCase()));
    if (!items.length) return null;
    return <div key={group.key}><p className="px-3 text-[10px] font-bold uppercase tracking-[.2em] text-blue-200/70">{t(`groups.${group.key}`)}</p><ul className="mt-2 space-y-1">{items.map((item) => {
      const active = pathname === item.href || (item.href !== "/staff" && pathname.startsWith(`${item.href}/`));
      const Icon = item.icon;
      return <li key={item.href}><Link href={item.href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined} className={cn("flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors", active ? "bg-white text-[#0b2b80] shadow-lg shadow-black/10" : "text-blue-50 hover:bg-white/10 hover:text-white")}><Icon className="size-[18px] shrink-0" aria-hidden="true" />{t(`nav.${item.key}`)}</Link></li>;
    })}</ul></div>;
  })}{navQuery && !groups.some((group) => group.items.some((item) => item.roles.some((role) => roles.includes(role)) && t(`nav.${item.key}`).toLocaleLowerCase().includes(navQuery.trim().toLocaleLowerCase()))) && <p className="px-3 text-sm text-blue-100">{t("noNavigationResults")}</p>}</nav><div className="mt-auto border-t border-white/10 p-5"><p className="truncate text-sm font-semibold text-white">{user?.full_name}</p><p className="truncate text-xs text-blue-200">{user?.email}</p><Link href="/" className="mt-4 inline-flex text-xs font-semibold text-amber-300 hover:text-white">{t("viewSite")} ↗</Link></div></>;

  return <div className="min-h-[calc(100vh-76px)] bg-[#f4f6fb]"><div className="mx-auto max-w-[1800px] lg:grid lg:grid-cols-[264px_minmax(0,1fr)]"><aside className="hidden min-h-[calc(100vh-76px)] flex-col bg-gradient-to-b from-[#071c50] via-[#082c87] to-[#061641] lg:sticky lg:top-[76px] lg:flex lg:max-h-[calc(100vh-76px)] lg:overflow-y-auto">{nav(false)}</aside><div className="min-w-0"><div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 lg:px-9"><button type="button" onClick={() => setMobileOpen(true)} aria-label={t("openMenu")} aria-expanded={mobileOpen} className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-primary lg:hidden"><Menu className="size-5" /></button><div className="min-w-0"><p className="hidden text-[11px] font-semibold uppercase tracking-[.16em] text-slate-500 sm:block">{t("workspace")}</p><p className="truncate text-sm font-semibold text-slate-900">{currentItem ? t(`nav.${currentItem.key}`) : t("workspace")}</p></div><span className="hidden text-xs text-slate-500 sm:block">{user?.full_name}</span></div>{children}</div></div>{mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button type="button" aria-label={t("closeMenu")} onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-slate-950/65" /><aside aria-label={t("navigation")} className="relative flex h-full w-[min(88vw,290px)] flex-col overflow-y-auto bg-gradient-to-b from-[#071c50] via-[#082c87] to-[#061641] shadow-2xl"><button type="button" onClick={() => setMobileOpen(false)} aria-label={t("closeMenu")} className="absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-full bg-slate-100 text-primary"><X className="size-4" /></button>{nav(true)}</aside></div>}</div>;
}
