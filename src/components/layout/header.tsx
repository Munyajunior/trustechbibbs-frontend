"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Container } from "@/components/shared/container";
import { buttonVariants } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/programs", key: "programs" },
  { href: "/admissions", key: "admissions" },
  { href: "/news", key: "news" },
  { href: "/events", key: "events" },
  { href: "/contact", key: "contact" },
] as const;

export function Header() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const accountHref = !token || !user
    ? "/login"
    : user.roles.includes("student")
      ? "/student"
      : user.roles.some((role) => ["registrar", "admin", "super_admin"].includes(role))
        ? "/staff/admissions"
        : user.roles.includes("editor")
          ? "/staff/content"
        : "/admissions/status";
  const accountLabel = token && user ? tc("myAccount") : tc("signIn");

  return (
    <header className="sticky top-0 z-40 border-b border-[#e8e9ee] bg-white/95 backdrop-blur-md">
      <Container>
        <div className="flex h-[76px] items-center justify-between gap-4">
          {/* Brand */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2"
            aria-label={tc("brand")}
          >
            <Image src="/images/trustech-shield.jpg" alt="" width={57} height={57} className="size-[52px] object-contain" priority />
            <span className="leading-[1.02]">
              <span className="block text-[9px] font-bold tracking-[.055em] text-[#b58100] sm:text-[10px]">
                {tc("brandType")}
              </span>
              <span className="block text-[19px] font-extrabold tracking-[-.05em] text-primary sm:text-[23px]">
                TRUSTECH
              </span>
              <span className="hidden text-[9px] font-bold tracking-[.04em] text-[#b58100] sm:block">
                {tc("brandTagline")}
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-0">
              {NAV_ITEMS.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "rounded-md px-2 py-2 text-[12px] font-medium transition-colors",
                        active
                          ? "text-primary"
                          : "text-gray-700 hover:text-primary",
                      )}
                    >
                      {t(item.key)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Desktop actions */}
          <div className="hidden items-center gap-2 lg:flex">
            <LanguageSwitcher />
            <Link href={accountHref} className="hidden rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-primary-subtle 2xl:block">{accountLabel}</Link>
            <Link
              href="/admissions"
              className={buttonVariants({ variant: "accent", size: "sm" })}
            >
              {tc("apply")}
            </Link>
          </div>

          {/* Mobile trigger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? tc("closeMenu") : tc("openMenu")}
            className="grid size-11 place-items-center rounded-md text-gray-700 lg:hidden"
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </Container>

      {/* Mobile menu */}
      {open && (
        <div id="mobile-menu" className="border-t border-gray-200 bg-white lg:hidden">
          <Container className="py-4">
            <nav aria-label="Mobile">
              <ul className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-3 py-2.5 text-base font-medium text-gray-800 hover:bg-primary-subtle hover:text-primary"
                    >
                      {t(item.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <LanguageSwitcher />
              <Link href={accountHref} onClick={() => setOpen(false)} className="text-sm font-semibold text-primary">{accountLabel}</Link>
              <Link
                href="/admissions"
                onClick={() => setOpen(false)}
                className={buttonVariants({ variant: "accent", size: "md" })}
              >
                {tc("apply")}
              </Link>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
