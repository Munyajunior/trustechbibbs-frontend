import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { Footer } from "@/components/layout/footer";
import { Header, type HeaderLabels } from "@/components/layout/header";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { AuthSessionBootstrap } from "@/components/features/auth-session-bootstrap";
import { SkipLink } from "@/components/shared/skip-link";
import { routing } from "@/i18n/routing";
import { selectClientMessages } from "@/lib/client-messages";
import { fontVariables } from "@/lib/fonts";
import { jsonLdScript } from "@/lib/json-ld";

import "../globals.css";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

/** Pre-render both locales at build time. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Omit<LayoutProps, "children">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home.meta" });
  const tc = await getTranslations({ locale, namespace: "common" });

  return {
    title: {
      default: t("title"),
      // Child pages set their own title; this suffixes it.
      template: `%s | Glotech`,
    },
    description: t("description"),
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ),
    alternates: {
      canonical: `/${locale}`,
      languages: { en: "/en", "x-default": "/en", fr: "/fr" },
    },
    openGraph: {
      type: "website",
      locale: locale === "fr" ? "fr_CM" : "en_CM",
      siteName: tc("brand"),
      images: [
        {
          url: "/site-media/logo",
          alt: tc("brand"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: ["/site-media/logo"],
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;

  // Reject any locale that isn't configured rather than rendering a broken page.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Required for static rendering of this segment.
  setRequestLocale(locale);

  const tc = await getTranslations({ locale, namespace: "common" });
  const clientMessages = await selectClientMessages([]);
  const tn = await getTranslations({ locale, namespace: "nav" });
  const ts = await getTranslations({ locale, namespace: "staffDashboard" });
  const headerLabels: HeaderLabels = {
    nav: Object.fromEntries(NAV_ITEMS.map(({ key }) => [key, tn(key)])) as HeaderLabels["nav"],
    common: {
      myAccount: tc("myAccount"),
      signIn: tc("signIn"),
      apply: tc("apply"),
      closeMenu: tc("closeMenu"),
      openMenu: tc("openMenu"),
      signOut: tc("signOut"),
      signOutFailed: tc("signOutFailed"),
    },
    language: { label: tc("language"), french: tc("switchToFrench"), english: tc("switchToEnglish") },
    staff: { workspace: ts("workspace"), viewSite: ts("viewSite") },
  };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: tc("brand"),
    url: `${siteUrl}/${locale}`,
    logo: `${siteUrl}/images/glotech-shield.jpg`,
    telephone: "+237675502969",
    address: { "@type": "PostalAddress", addressLocality: "Douala", addressCountry: "CM" },
  };

  return (
    <html lang={locale} className={fontVariables}>
      <body className="flex min-h-dvh flex-col antialiased">
        <script
          type="application/ld+json"
          // Serialized with jsonLdScript so "<" cannot terminate the tag.
          dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd) }}
        />
        <NextIntlClientProvider messages={clientMessages}>
          <AuthSessionBootstrap locale={locale} />
          <SkipLink />
          <Header labels={headerLabels} />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Suspense>
            <Footer />
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
