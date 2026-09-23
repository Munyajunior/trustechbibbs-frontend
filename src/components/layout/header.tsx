"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Container } from "@/components/shared/container";
import { buttonVariants } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

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

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5"
            aria-label={tc("brand")}
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-md bg-primary font-display text-sm font-bold text-white"
            >
              T
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block font-display text-sm font-semibold text-gray-900">
                {tc("brand")}
              </span>
              <span className="block text-[11px] text-gray-500">
                {tc("brandTagline")}
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
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
                        "rounded-md px-3 py-2 text-sm font-medium transition-colors",
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
          <div className="hidden items-center gap-3 lg:flex">
            <LanguageSwitcher />
            <Link
              href="/admissions"
              className={buttonVariants({ variant: "primary", size: "sm" })}
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
              <Link
                href="/admissions"
                onClick={() => setOpen(false)}
                className={buttonVariants({ variant: "primary", size: "md" })}
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
