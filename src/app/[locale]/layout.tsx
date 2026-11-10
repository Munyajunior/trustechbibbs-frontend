import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { AuthSessionBootstrap } from "@/components/features/auth-session-bootstrap";
import { SkipLink } from "@/components/shared/skip-link";
import { routing } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { jsonLdScript } from "@/lib/json-ld";

import "../globals.css";

/**
 * Message namespaces that are only read by server components. They are left out
 * of the client provider so they are not serialized into every page's HTML and
 * re-parsed during hydration. If a client component starts calling
 * `useTranslations("<one of these>")`, remove that namespace from this list.
 */
const SERVER_ONLY_NAMESPACES = [
  "sitePages", "institutionalPages", "schoolsIndex", "schoolDetail", "programs",
  "about", "admissions", "news", "events", "privacy", "terms", "accessibility",
  "notFound",
];

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
      template: `%s | Trustech`,
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
  const allMessages = await getMessages();
  const clientMessages = Object.fromEntries(
    Object.entries(allMessages).filter(([namespace]) => !SERVER_ONLY_NAMESPACES.includes(namespace)),
  );
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: tc("brand"),
    url: `${siteUrl}/${locale}`,
    logo: `${siteUrl}/images/trustech-shield.jpg`,
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
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
