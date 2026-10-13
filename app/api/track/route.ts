import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { api, getConvex } from "../../../lib/convex";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES = new Set(["pageview", "play", "pause", "complete", "next", "prev"]);
const BOT = /bot\b|crawler|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|whatsapp|telegrambot|slackbot|discordbot|linkedinbot|pinterest|vkshare|w3c_validator|lighthouse|pagespeed|headlesschrome|phantomjs|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|amazonbot/i;

function clientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }
  const realIp = headers.get("x-real-ip")?.trim();
  return realIp || "";
}

function geo(headers: Headers, name: string) {
  const raw = headers.get(name)?.trim();
  if (!raw) return undefined;
  try {
    const value = decodeURIComponent(raw).slice(0, 80);
    return value || undefined;
  } catch {
    return raw.slice(0, 80);
  }
}

function cleanProgress(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000;
}

function isPublicIp(ip: string) {
  if (!ip || ip === "::1" || ip === "127.0.0.1") return false;
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("127.")) return false;
  const [first, second] = ip.split(".").map(Number);
  if (first === 172 && second >= 16 && second <= 31) return false;
  return true;
}

async function placeFromIp(ip: string) {
  if (!isPublicIp(ip)) return null;
  const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
    headers: { Accept: "application/json", "User-Agent": "TrustIssuesAnalytics/1.0" },
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    success?: boolean;
    city?: string;
    region?: string;
    country_code?: string;
  };
  if (!data.success) return null;
  const country = data.country_code?.toUpperCase();
  return {
    ...(data.city ? { city: data.city.slice(0, 80) } : {}),
    ...(data.region ? { region: data.region.slice(0, 80) } : {}),
    ...(country ? { country } : {}),
  };
}

export async function POST(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (BOT.test(userAgent)) return new NextResponse(null, { status: 204 });

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 12_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  const salt = process.env.ANALYTICS_IP_SALT;
  const secret = process.env.ANALYTICS_SECRET;
  if (!salt || !secret || !process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json({ error: "Analytics is not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = body as { visitorId?: unknown; sessionId?: unknown; events?: unknown };
  if (typeof payload.visitorId !== "string" || !UUID.test(payload.visitorId)) {
    return NextResponse.json({ error: "Invalid visitor" }, { status: 400 });
  }
  if (typeof payload.sessionId !== "string" || !UUID.test(payload.sessionId)) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }
  if (!Array.isArray(payload.events) || payload.events.length === 0 || payload.events.length > 20) {
    return NextResponse.json({ error: "Invalid events" }, { status: 400 });
  }

  const events = [];
  for (const entry of payload.events) {
    if (!entry || typeof entry !== "object") {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }
    const event = entry as { type?: unknown; trackId?: unknown; progress?: unknown };
    if (typeof event.type !== "string" || !TYPES.has(event.type)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }
    if (event.trackId !== undefined && (typeof event.trackId !== "string" || event.trackId.length > 120)) {
      return NextResponse.json({ error: "Invalid track" }, { status: 400 });
    }
    const progress = cleanProgress(event.progress);
    events.push({
      type: event.type as "pageview" | "play" | "pause" | "complete" | "next" | "prev",
      ...(typeof event.trackId === "string" ? { trackId: event.trackId } : {}),
      ...(progress !== undefined ? { progress } : {}),
    });
  }

  const ip = clientIp(request.headers);
  const ipHash = ip ? createHash("sha256").update(`${salt}:${ip}`).digest("hex") : "";

  try {
    const precise = await placeFromIp(ip);
    const country = precise?.country || geo(request.headers, "x-vercel-ip-country");
    const city = precise?.city || geo(request.headers, "x-vercel-ip-city");
    const region = precise?.region || geo(request.headers, "x-vercel-ip-country-region");
    await getConvex().mutation(api.analytics.recordEvents, {
      secret,
      visitorId: payload.visitorId,
      sessionId: payload.sessionId,
      ipHash,
      ...(country ? { country } : {}),
      ...(city ? { city } : {}),
      ...(region ? { region } : {}),
      events,
    });
  } catch {
    return NextResponse.json({ error: "Could not record analytics" }, { status: 502 });
  }

  return new NextResponse(null, { status: 204 });
}
