"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";
import { haversineKm, crowdWord } from "@/lib/helpers";
import { IconBack, IconMapPin } from "./icons";

const FILTERS = ["chill", "packed", "themed", "short queue"] as const;

export default function SearchScreen() {
  const { lang, back, q, setQ, pandals, user, zones, setSelPandal, go } = useApp();
  const txt = t(lang);
  const [active, setActive] = useState<string | null>(null);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    return pandals
      .filter((p) => {
        const hitQ =
          !query ||
          p.name.toLowerCase().includes(query) ||
          p.nameBn.includes(query) ||
          p.theme.toLowerCase().includes(query);
        const hitF =
          !active ||
          (active === "chill" && p.crowd <= 2) ||
          (active === "packed" && p.crowd >= 4) ||
          (active === "themed" && p.theme.length > 0) ||
          (active === "short queue" && p.queueMin <= 25);
        return hitQ && hitF;
      })
      .map((p) => ({ ...p, km: haversineKm(user, p) }))
      .sort((a, b) => a.km - b.km);
  }, [q, active, pandals, user]);

  return (
    <div className="absolute inset-0 z-10 flex flex-col anim-fade" style={{ background: "#111" }}>
      <div className="flex-none px-5" style={{ paddingTop: 62 }}>
        <div className="flex items-center gap-2.5 mb-4">
          <button
            onClick={back}
            className="w-[38px] h-[38px] rounded-[12px] border-0 flex items-center justify-center"
            style={{ background: "rgba(255,255,255,.07)" }}
          >
            <IconBack />
          </button>
          <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: "#f0eeec" }}>{txt.findTitle}</h2>
        </div>
        <div
          className="flex items-center gap-2.5 rounded-[13px] mb-3.5"
          style={{ background: "rgba(255,255,255,.07)", padding: "12px 16px" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="rgba(255,255,255,.35)" strokeWidth="1.9" />
            <path d="M16.5 16.5L21 21" stroke="rgba(255,255,255,.35)" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={txt.searchPH}
            style={{
              flex: 1, background: "transparent", border: 0, outline: 0,
              fontSize: 14, fontWeight: 600, color: "#f0eeec",
            }}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap mb-4">
          {FILTERS.map((f) => {
            const on = active === f;
            return (
              <button
                key={f}
                onClick={() => setActive(on ? null : f)}
                className="rounded-[20px]"
                style={{
                  padding: "6px 13px", borderWidth: 1.5, borderStyle: "solid",
                  borderColor: on ? "#E9C15B" : "rgba(255,255,255,.12)",
                  background: on ? "rgba(233,193,91,.18)" : "transparent",
                  color: on ? "#E9C15B" : "rgba(255,255,255,.6)",
                  fontSize: 12, fontWeight: 800, cursor: "pointer",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {results.map((r) => {
          const z = zones.find((x) => x.id === r.zoneId);
          return (
            <button
              key={r.id}
              onClick={() => { setSelPandal(r.id); go("pandal"); }}
              className="flex w-full gap-3 items-center py-3 text-left border-0"
              style={{ background: "transparent", borderBottom: "1px solid rgba(255,255,255,.06)" }}
            >
              <div
                className="w-[42px] h-[42px] flex-none rounded-[13px] flex items-center justify-center"
                style={{ background: "rgba(233,193,91,.14)" }}
              >
                <IconMapPin />
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 15, fontWeight: 800, color: "#f0eeec", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {lang === "en" ? r.name : r.nameBn}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.38)", marginTop: 3 }}>
                  {lang === "en" ? z?.name : z?.nameBn} · {crowdWord(r.crowd, lang)}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#E9C15B", flexShrink: 0 }}>
                {r.km.toFixed(1)} km
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
