"use client";

import { useEffect, useState } from "react";

type Range = "24h" | "7d" | "30d" | "all";

type Stats = {
  visitors: number;
  plays: number;
  listeners: number;
  conversion: number;
  averageProgress: number | null;
  grain: "hour" | "day";
  series: { t: number; visits: number; plays: number }[];
  countries: { name: string; count: number }[];
  cities: { name: string; count: number }[];
  rows: { visitorId: string; lastSeen: number; location: string; visits: number; played: boolean }[];
};

const RANGES: { id: Range; label: string }[] = [
  { id: "24h", label: "24h" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "all", label: "All" },
];

const regions = typeof Intl !== "undefined" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;

function countryLabel(code: string) {
  if (!/^[A-Za-z]{2}$/.test(code)) return code;
  try {
    return regions?.of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

function placeLabel(location: string) {
  return location
    .split(", ")
    .map((part, index, parts) => (index === parts.length - 1 ? countryLabel(part) : part))
    .join(", ");
}

function percent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

function formatWhen(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function formatBucket(timestamp: number, grain: "hour" | "day") {
  const date = new Date(timestamp);
  if (grain === "hour") return date.toLocaleTimeString(undefined, { hour: "numeric" });
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function LineChart({ series, grain }: { series: Stats["series"]; grain: Stats["grain"] }) {
  const width = 640;
  const height = 220;
  const pad = { l: 28, r: 8, t: 16, b: 28 };
  const max = Math.max(1, ...series.map((point) => Math.max(point.visits, point.plays)));
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const x = (index: number) => (series.length <= 1 ? pad.l + innerW / 2 : pad.l + (index / (series.length - 1)) * innerW);
  const y = (value: number) => pad.t + innerH - (value / max) * innerH;
  const path = (key: "visits" | "plays") => series.map((point, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(point[key]).toFixed(1)}`).join(" ");
  const labelEvery = Math.max(1, Math.ceil(series.length / 6));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label="Visits and plays over time">
      {[0, 0.5, 1].map((step) => {
        const yPos = y(max * step);
        return (
          <g key={step}>
            <line x1={pad.l} x2={width - pad.r} y1={yPos} y2={yPos} stroke="rgba(255,255,255,0.08)" />
            <text x={0} y={yPos + 4} fill="rgba(255,255,255,0.45)" fontSize="11">
              {Math.round(max * step)}
            </text>
          </g>
        );
      })}
      <path d={path("visits")} fill="none" stroke="#d5feff" strokeWidth="2" />
      <path d={path("plays")} fill="none" stroke="#9eb6ff" strokeWidth="2" />
      {series.map((point, index) => (
        <g key={point.t}>
          <circle cx={x(index)} cy={y(point.visits)} r="2.5" fill="#d5feff" />
          <circle cx={x(index)} cy={y(point.plays)} r="2.5" fill="#9eb6ff" />
          {index % labelEvery === 0 ? (
            <text x={x(index)} y={height - 6} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="11">
              {formatBucket(point.t, grain)}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

function RankList({ title, items }: { title: string; items: { name: string; count: number }[] | null }) {
  const max = Math.max(1, ...(items ?? []).map((item) => item.count));
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-[0.62rem] uppercase tracking-[0.14em] text-white/50">{title}</h2>
      {items === null ? <p className="mt-4 text-sm text-white/45">Loading</p> : null}
      {items?.length === 0 ? <p className="mt-4 text-sm text-white/45">No data in this range</p> : null}
      <ul className="mt-3 space-y-2.5">
        {(items ?? []).map((item) => (
          <li key={item.name}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{title === "Countries" ? countryLabel(item.name) : item.name}</span>
              <span className="tabular-nums text-white/60">{item.count}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#d5feff]" style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Dashboard() {
  const [range, setRange] = useState<Range>("7d");
  const [playedOnly, setPlayedOnly] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const tz = new Date().getTimezoneOffset();
    fetch(`/api/data/stats?range=${range}&played=${playedOnly ? "1" : "0"}&tz=${tz}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("load failed");
        return (await response.json()) as Stats;
      })
      .then((data) => {
        if (data) setStats(data);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError("Could not load analytics");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [range, playedOnly]);

  const cards = [
    { label: "Unique visitors", value: stats ? String(stats.visitors) : "—" },
    { label: "Total plays", value: stats ? String(stats.plays) : "—" },
    { label: "Unique listeners", value: stats ? String(stats.listeners) : "—" },
    { label: "Play conversion", value: stats ? percent(stats.conversion) : "—" },
  ];

  return (
    <main className="fixed inset-0 overflow-y-auto bg-[linear-gradient(to_top,#10242c,#1a2744,#1a1428,#14080c)] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <header>
          <p className="text-[0.62rem] uppercase tracking-[0.14em] text-white/50">Trust Issues</p>
          <h1 className="mt-1 text-[1.7rem] font-semibold tracking-[-0.03em]">Listeners</h1>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-full border border-white/10 bg-white/[0.04] p-1" role="group" aria-label="Date range">
            {RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={range === item.id}
                onClick={() => setRange(item.id)}
                className={`rounded-full px-3 py-1.5 text-[0.75rem] ${range === item.id ? "bg-[#d5feff] text-[#142033]" : "text-white/70"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap rounded-full border border-white/10 bg-white/[0.04] p-1" role="group" aria-label="Visitor filter">
            <button
              type="button"
              aria-pressed={!playedOnly}
              onClick={() => setPlayedOnly(false)}
              className={`rounded-full px-3 py-1.5 text-[0.75rem] ${playedOnly ? "text-white/70" : "bg-[#d5feff] text-[#142033]"}`}
            >
              All visitors
            </button>
            <button
              type="button"
              aria-pressed={playedOnly}
              onClick={() => setPlayedOnly(true)}
              className={`rounded-full px-3 py-1.5 text-[0.75rem] ${playedOnly ? "bg-[#d5feff] text-[#142033]" : "text-white/70"}`}
            >
              Visitors who played
            </button>
          </div>
        </div>

        {error ? <p className="text-sm text-[#ffb4b4]">{error}</p> : null}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy={loading}>
          {cards.map((card) => (
            <article key={card.label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
              <p className="text-[0.62rem] uppercase tracking-[0.12em] text-white/45">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.03em]">{card.value}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[0.62rem] uppercase tracking-[0.14em] text-white/50">
              {stats?.grain === "hour" ? "Hourly" : "Daily"}
            </h2>
            <div className="flex gap-4 text-[0.72rem] text-white/60">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#d5feff]" /> Visits</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#9eb6ff]" /> Plays</span>
            </div>
          </div>
          {!stats ? <p className="py-16 text-center text-sm text-white/45">{error ? "—" : "Loading"}</p> : stats.series.some((point) => point.visits > 0 || point.plays > 0) ? <LineChart series={stats.series} grain={stats.grain} /> : <p className="py-16 text-center text-sm text-white/45">No visits in this range</p>}
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <RankList title="Countries" items={stats?.countries ?? null} />
          <RankList title="Cities" items={stats?.cities ?? null} />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
          <p className="text-[0.62rem] uppercase tracking-[0.12em] text-white/45">Average listen progress</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.03em]">
            {stats?.averageProgress === null || stats?.averageProgress === undefined ? "—" : percent(stats.averageProgress)}
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-[0.62rem] uppercase tracking-[0.12em] text-white/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Last visit</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Visits</th>
                  <th className="px-4 py-3 font-medium">Played</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.rows ?? []).map((row) => (
                  <tr key={row.visitorId} className="border-t border-white/10">
                    <td className="whitespace-nowrap px-4 py-3 text-white/85">{formatWhen(row.lastSeen)}</td>
                    <td className="px-4 py-3">{placeLabel(row.location)}</td>
                    <td className="px-4 py-3 tabular-nums">{row.visits}</td>
                    <td className="px-4 py-3">{row.played ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!stats ? <p className="px-4 py-8 text-sm text-white/45">{error ? "—" : "Loading"}</p> : stats.rows.length === 0 ? <p className="px-4 py-8 text-sm text-white/45">No visitors in this range</p> : null}
        </section>
      </div>
    </main>
  );
}
