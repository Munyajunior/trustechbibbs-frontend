import { useLocale } from "next-intl";

/** Keep the supplied shield artwork; localize the adjacent official name. */
export function BrandMark({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const descriptor = locale === "fr"
    ? "INSTITUT SUPÉRIEUR DE GESTION ET DE SCIENCE BIOMEDICAL"
    : "HIGHER INSTITUTE OF BUSINESS MANAGEMENT AND BIOMEDICAL SCIENCES";

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {/* Plain <img>: a fixed 64px asset, so next/image's client runtime would add nothing. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/site-media/logo"
        alt=""
        width={64}
        height={64}
        decoding="async"
        loading={compact ? "lazy" : "eager"}
        style={{ color: "transparent" }}
        className={compact ? "size-12 shrink-0 object-contain" : "size-[58px] shrink-0 object-contain"}
      />
      <span className={compact ? "block min-w-0 max-w-[190px] leading-none" : "block min-w-0 max-w-[210px] leading-none sm:max-w-[240px]"}>
        <span className="block text-[25px] font-black leading-[.96] tracking-[-.035em] text-[#092775]">TRUSTECH</span>
        <span className="mt-1 block text-[8px] font-extrabold uppercase leading-[1.2] tracking-[.02em] text-[#7a6000] sm:text-[9px]">{descriptor}</span>
      </span>
    </span>
  );
}
