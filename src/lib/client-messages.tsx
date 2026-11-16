import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";

/**
 * Message namespaces that are only read by server components. They are never
 * serialized to the browser. If a client component starts calling
 * `useTranslations("<one of these>")`, remove that namespace from this list.
 */
export const SERVER_ONLY_NAMESPACES: readonly string[] = [
  "sitePages", "institutionalPages", "schoolsIndex", "schoolDetail", "programs",
  "about", "admissions", "news", "events", "privacy", "terms", "accessibility",
  "notFound",
];

/**
 * Translations read by client components in the site shell (notification bell,
 * error boundary, shared form/button labels). Every page pays for these, so keep
 * the list as small as possible: dotted paths pick a single sub-tree or key.
 * The header and footer receive server-resolved strings instead.
 */
export const SHELL_MESSAGES: readonly string[] = ["common", "notifications", "error"];

type Tree = Record<string, unknown>;

function pick(source: Tree, paths: readonly string[]): Tree {
  const result: Tree = {};
  for (const path of paths) {
    const keys = path.split(".");
    let from: unknown = source;
    let to = result;
    for (let i = 0; i < keys.length; i += 1) {
      if (typeof from !== "object" || from === null || !(keys[i] in (from as Tree))) break;
      const value = (from as Tree)[keys[i]];
      if (i === keys.length - 1) {
        to[keys[i]] = value;
      } else {
        to[keys[i]] = (to[keys[i]] as Tree | undefined) ?? {};
        to = to[keys[i]] as Tree;
        from = value;
      }
    }
  }
  return result;
}

/** Messages for the client provider: only the listed namespaces (or everything client-readable). */
export async function selectClientMessages(namespaces: readonly string[] | "all"): Promise<Tree> {
  const all = (await getMessages()) as Tree;
  if (namespaces === "all") {
    return Object.fromEntries(Object.entries(all).filter(([namespace]) => !SERVER_ONLY_NAMESPACES.includes(namespace)));
  }
  return pick(all, [...SHELL_MESSAGES, ...namespaces]);
}

/**
 * Wraps a subtree in a client provider holding the namespaces its client
 * components read, on top of the shell messages. Use `namespaces="all"` only for
 * authenticated work areas that read many namespaces.
 */
export async function ClientMessages({
  namespaces,
  children,
}: {
  namespaces: readonly string[] | "all";
  children: ReactNode;
}) {
  return <NextIntlClientProvider messages={await selectClientMessages(namespaces)}>{children}</NextIntlClientProvider>;
}
