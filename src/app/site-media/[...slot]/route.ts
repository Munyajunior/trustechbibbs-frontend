import { NextResponse, type NextRequest } from "next/server";

import { API_BASE_URL } from "@/lib/api/client";
import { siteMediaFallbacks, type SiteMediaSlot } from "@/lib/site-media";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ slot: string[] }> }) {
  const { slot: parts } = await context.params;
  const slot = parts.join("/");
  const fallback = siteMediaFallbacks[slot as SiteMediaSlot];
  if (!fallback && !/^uploads\/[0-9a-f-]{36}$/.test(slot)) {
    return new NextResponse(null, { status: 404 });
  }
  try {
    const result = await fetch(`${API_BASE_URL}/public/media/${slot}`, { cache: "no-store" });
    if (result.ok && result.headers.get("content-type")?.startsWith("image/")) {
      return new NextResponse(result.body, {
        headers: {
          "Content-Type": result.headers.get("content-type")!,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  } catch {
    // Keep the public site usable while the separately hosted API is unavailable.
  }
  return fallback
    ? NextResponse.redirect(new URL(fallback, _request.url), { headers: { "Cache-Control": "no-store" } })
    : new NextResponse(null, { status: 404 });
}
