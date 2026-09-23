/** A nested message catalogue as loaded from `src/messages/*.json`. */
export type MessageTree = { [key: string]: string | MessageTree };

function isTree(value: unknown): value is MessageTree {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recursively overlay `override` on top of `base`.
 *
 * Used to layer a translation catalogue over English so that a key missing at
 * ANY depth falls back to its English string. A shallow spread would drop
 * whole nested groups, so the recursion matters.
 */
export function deepMerge(base: MessageTree, override: MessageTree): MessageTree {
  const result: MessageTree = { ...base };

  for (const [key, overrideValue] of Object.entries(override)) {
    const baseValue = result[key];
    if (isTree(baseValue) && isTree(overrideValue)) {
      result[key] = deepMerge(baseValue, overrideValue);
    } else if (typeof overrideValue === "string") {
      // Ignore blank translations — fall back to the base (English) string.
      result[key] = overrideValue.trim() === "" ? baseValue : overrideValue;
    } else if (overrideValue !== undefined) {
      result[key] = overrideValue;
    }
  }

  return result;
}
