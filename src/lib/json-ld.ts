/**
 * Serialize structured data for embedding in a `<script type="application/ld+json">`.
 *
 * Why not plain `JSON.stringify`: the payload contains CMS-authored text. A
 * value containing `</script>` would terminate the tag early and let the rest
 * of the string be parsed as HTML — an XSS vector. Escaping `<` to its `\uXXXX`
 * form is still valid JSON (and valid JSON-LD) but can no longer close the tag.
 *
 * `>`, `&` and the U+2028/U+2029 line separators get the same treatment: the
 * latter are legal in JSON but are line terminators in JavaScript source, so
 * leaving them raw breaks parsers that inline the script.
 *
 * The pattern is built via `new RegExp` from an ASCII-only string so this file
 * never has to contain a literal U+2028 (which would terminate this very line).
 */
const UNSAFE_CHARS = new RegExp("[<>&\\u2028\\u2029]", "g");

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(
    UNSAFE_CHARS,
    (char) => "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}
