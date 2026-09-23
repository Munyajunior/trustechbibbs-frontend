/**
 * Helpers for the backend's paired-column bilingual model.
 *
 * The API returns translatable text as `<field>_en` / `<field>_fr`, where the
 * English value is guaranteed and French is optional. Platform rule: fall back
 * to English whenever the French value is missing or blank.
 */

import type { Locale } from "@/lib/api/types";

/** Resolve an `_en`/`_fr` pair for the given locale, falling back to English. */
export function pickLocalized(
  en: string | null | undefined,
  fr: string | null | undefined,
  locale: Locale,
): string {
  if (locale === "fr") {
    const french = fr?.trim();
    if (french) return french;
  }
  return en?.trim() ?? "";
}

/**
 * Resolve a translatable field on a record by its base name.
 *
 * @example
 * localizedField(program, "name", "fr") // -> program.name_fr ?? program.name_en
 */
export function localizedField<
  TBase extends string,
  TRecord extends Partial<Record<`${TBase}_en` | `${TBase}_fr`, string | null>>,
>(record: TRecord, base: TBase, locale: Locale): string {
  const en = record[`${base}_en` as keyof TRecord] as string | null | undefined;
  const fr = record[`${base}_fr` as keyof TRecord] as string | null | undefined;
  return pickLocalized(en, fr, locale);
}
