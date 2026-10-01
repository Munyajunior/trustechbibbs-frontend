import { MapPin } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";

const EXPLORE_LINKS = [
  { href: "/schools", key: "schools" },
  { href: "/programs", key: "programs" },
  { href: "/about", key: "about" },
  { href: "/news", key: "news" },
  { href: "/events", key: "events" },
] as const;

export function Footer() {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");

  return (
    <footer className="mt-auto border-t border-[#e7eaf0] bg-[#f8faff]">
      <Container className="py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <Image src="/site-media/logo" unoptimized alt="" width={48} height={48} className="size-12 object-contain" />
              <span className="font-display text-base font-bold text-primary">{t("brand")}</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-gray-600">{t("tagline")}</p>
            <p className="mt-4 flex items-center gap-1.5 text-sm text-gray-600">
              <MapPin aria-hidden="true" className="size-4 shrink-0" />
              {t("address")}
            </p>
          </div>

          {/* Explore */}
          <div>
            <h2 className="font-display text-sm font-semibold text-gray-900">
              {t("explore")}
            </h2>
            <ul className="mt-3 space-y-2">
              {EXPLORE_LINKS.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-600 hover:text-primary"
                  >
                    {tn(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h2 className="font-display text-sm font-semibold text-gray-900">
              {t("legal")}
            </h2>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/privacy" className="text-sm text-gray-600 hover:text-primary">
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-gray-600 hover:text-primary">
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link href="/accessibility" className="text-sm text-gray-600 hover:text-primary">
                  {t("accessibility")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-200 pt-6">
          <p className="text-xs text-gray-500">
            {t("rights", { year: new Date().getFullYear() })}
          </p>
        </div>
      </Container>
    </footer>
  );
}
