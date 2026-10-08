import { NextResponse, type NextRequest } from "next/server";

import { API_BASE_URL } from "@/lib/api/client";
import { siteMediaFallbacks, type SiteMediaSlot } from "@/lib/site-media";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ slot: string[] }> }) {
  const { slot: parts } = await context.params;
  const slot = parts.join("/");
  const fallback = siteMediaFallbacks[slot as SiteMediaSlot];
  if (!fallback && !/^uploads\/[0-9a-f-]{36}$/.test(slot)) {
    return new NextResponse(null, { status: 404 });
  }
  try {
    const range = request.headers.get("range");
    const result = await fetch(`${API_BASE_URL}/public/media/${slot}`, {
      cache: "no-store",
      headers: range ? { Range: range } : undefined,
    });
    const contentType = result.headers.get("content-type");
    if (result.ok && (contentType?.startsWith("image/") || contentType === "video/mp4" || contentType === "video/webm")) {
      const headers = new Headers({
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      for (const name of ["Content-Length", "Content-Range", "Accept-Ranges"]) {
        const value = result.headers.get(name);
        if (value) headers.set(name, value);
      }
      return new NextResponse(result.body, {
        status: result.status,
        headers,
      });
    }
    if (result.status === 416) return new NextResponse(null, {
      status: 416,
      headers: { "Content-Range": result.headers.get("content-range") ?? "bytes */0" },
    });
  } catch {
    // Keep the public site usable while the separately hosted API is unavailable.
  }
  return fallback
    ? new NextResponse(null, {
        status: 307,
        headers: { Location: fallback, "Cache-Control": "no-store" },
      })
    : new NextResponse(null, { status: 404 });
}
