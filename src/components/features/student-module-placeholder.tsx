"use client";

import { useTranslations } from "next-intl";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";

type StudentModule = "courses" | "results" | "fees";

export function StudentModulePlaceholder({ module }: { module: StudentModule }) {
  const t = useTranslations("student.modules");
  const student = useTranslations("student.profile");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  if (!token || !user?.roles.includes("student")) return (
    <Container className="py-12">
      <div className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-semibold text-gray-900">{student("accessTitle")}</h1>
        <p className="mt-3 text-gray-600">{student("accessBody")}</p>
        <Link href="/login" className="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-white">{student("signIn")}</Link>
      </div>
    </Container>
  );

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/student" className="text-sm font-semibold text-primary underline underline-offset-2">{t("back")}</Link>
        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="font-display text-3xl font-semibold text-gray-900">{t(`${module}.title`)}</h1>
          <p className="mt-3 leading-7 text-gray-600">{t(`${module}.body`)}</p>
          <p className="mt-6 rounded-md bg-primary-subtle p-4 text-sm text-primary">{t("availability")}</p>
        </section>
      </div>
    </Container>
  );
}
