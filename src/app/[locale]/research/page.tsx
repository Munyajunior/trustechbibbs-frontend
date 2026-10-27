import type { Metadata } from "next";

import { InstitutionalLanding, institutionalMetadata } from "@/components/features/institutional-landing";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return institutionalMetadata(locale, "research");
}

export default async function ResearchPage({ params }: PageProps) {
  const { locale } = await params;
  return <InstitutionalLanding locale={locale} page="research" />;
}
