import Image from "next/image";

/** The bilingual Trustech wordmark stays identical on both language routes. */
export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2" aria-hidden="true">
      <Image
        src="/site-media/logo"
        unoptimized
        alt=""
        width={64}
        height={64}
        className={compact ? "size-12 shrink-0 object-contain" : "size-[58px] shrink-0 object-contain"}
        priority={!compact}
      />
      <span className="block min-w-0 leading-none">
        <span className="block whitespace-nowrap text-[10px] font-extrabold tracking-[.01em] text-[#d3a600]">INSTITUT UNIVERSITAIRE</span>
        <span className="block whitespace-nowrap text-[27px] font-black leading-[.98] tracking-[-.035em] text-[#092775]">TRUSTECH</span>
        <span className="block whitespace-nowrap text-[10px] font-extrabold tracking-[.01em] text-[#d3a600]">UNIVERSITY INSTITUTE</span>
      </span>
    </span>
  );
}
