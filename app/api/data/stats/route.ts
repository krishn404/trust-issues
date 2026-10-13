import { NextResponse } from "next/server";
import { api, getConvex } from "../../../../lib/convex";

const RANGES = new Set(["24h", "7d", "30d", "all"]);

export async function GET(request: Request) {
  const secret = process.env.ANALYTICS_SECRET;
  if (!secret || !process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json({ error: "Analytics is not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "7d";
  if (!RANGES.has(range)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const tzOffset = Number(url.searchParams.get("tz") ?? "0");
  try {
    const stats = await getConvex().query(api.analytics.dashboard, {
      secret,
      range: range as "24h" | "7d" | "30d" | "all",
      playedOnly: url.searchParams.get("played") === "1",
      tzOffset: Number.isFinite(tzOffset) ? tzOffset : 0,
    });
    return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load analytics" }, { status: 502 });
  }
}
