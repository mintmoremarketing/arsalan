"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";
import { haversineKm, driveMin, crowdWord, pandalPhoto, nearestNeighborOrder, pickBestArsalan } from "@/lib/helpers";
import { IconSearch, IconLocate, IconRoute } from "./icons";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

export default function MapScreen() {
  const {
    lang, zone, setZone, go, pandals, arsalans, user, toggleLang, zones,
    setSelPandal, setSelArsalan, recenter, routeMode, setRouteMode,
  } = useApp();
  const txt = t(lang);

  const zonePandalsRaw = pandals.filter((p) => p.zoneId === zone);
  const zonePandals = nearestNeighborOrder(zonePandalsRaw, { lat: user.lat, lng: user.lng } as any);
  const selPandalId = useApp((s) => s.selPandalId);
  const selArsalanId = useApp((s) => s.selArsalanId);
  const selArs = arsalans.find((a) => a.id === selArsalanId);
  const cardRailRef = useRef<HTMLDivElement>(null);

  // When the user taps a pandal pin, scroll the matching card into view
  useEffect(() => {
    if (!selPandalId) return;
    const el = cardRailRef.current?.querySelector<HTMLElement>(`[data-pandal-id="${selPandalId}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selPandalId]);
  const liveWaits = useApp((s) => s.liveWaits);
  const pick = pickBestArsalan(user, arsalans, liveWaits);
  const nearArs = pick?.best.arsalan;
  const nearKm = pick ? pick.best.km.toFixed(1) : "0";
  const nearMin = pick ? pick.best.travelMin : 0;
  const nearWait = pick ? pick.best.waitMin : 0;
  const runnerUp = pick && pick.ranked.length > 1 ? pick.ranked[1] : null;
  const savings = runnerUp ? runnerUp.totalMin - pick!.best.totalMin : 0;

  return (
    <div className="absolute inset-0 z-[5]">
      <MapView />

      {/* Top controls — anchor to the visible viewport. In a browser tab that
          means right under the address bar; in an installed PWA the safe-area
          value pushes it past the status bar / notch automatically. */}
      <div className="absolute z-[900] left-3.5 right-3.5 flex gap-2" style={{ top: "calc(12px + env(safe-area-inset-top, 0px))" }}>
        <button
          onClick={() => go("search")}
          className="flex-1 flex items-center gap-2.5 rounded-[14px] px-3.5 py-2.5 border text-left"
          style={{ background: "rgba(12,12,12,.88)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,.08)" }}
        >
          <IconSearch />
          <span style={{ fontSize: 13, color: "rgba(255,255,255,.35)", fontWeight: 500 }}>{txt.searchPH}</span>
        </button>
        <button
          onClick={toggleLang}
          className="w-[42px] h-[42px] rounded-xl border flex items-center justify-center"
          style={{ background: "rgba(12,12,12,.88)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,.08)" }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: lang === "en" ? "#E9C15B" : "#f0eeec" }}>
            {lang === "en" ? "বাং" : "EN"}
          </span>
        </button>
        <button
          onClick={recenter}
          className="w-[42px] h-[42px] rounded-xl border flex items-center justify-center"
          style={{ background: "rgba(12,12,12,.88)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,.08)" }}
        >
          <IconLocate />
        </button>
      </div>

      {/* Drive / Walk toggle — below the zone pills, right-aligned */}
      <div
        className="absolute z-[900]"
        style={{
          top: "calc(106px + env(safe-area-inset-top, 0px))",
          right: 14,
          background: "rgba(12,12,12,.88)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,.08)",
          borderRadius: 20,
          padding: 3,
          display: "flex",
          gap: 2,
        }}
      >
        <button
          onClick={() => setRouteMode("driving")}
          style={{
            padding: "4px 10px", border: 0, borderRadius: 16,
            fontSize: 10.5, fontWeight: 800, cursor: "pointer",
            background: routeMode === "driving" ? "#E9C15B" : "transparent",
            color: routeMode === "driving" ? "#111" : "rgba(255,255,255,.55)",
          }}
        >Drive</button>
        <button
          onClick={() => setRouteMode("walking")}
          style={{
            padding: "4px 10px", border: 0, borderRadius: 16,
            fontSize: 10.5, fontWeight: 800, cursor: "pointer",
            background: routeMode === "walking" ? "#E9C15B" : "transparent",
            color: routeMode === "walking" ? "#111" : "rgba(255,255,255,.55)",
          }}
        >Walk</button>
      </div>

      {/* Zone pills — horizontally scrollable so 5+ zones fit on any width */}
      <div
        className="absolute z-[900] left-0 right-0 flex gap-1.5 overflow-x-auto"
        style={{
          top: "calc(66px + env(safe-area-inset-top, 0px))",
          padding: "0 14px",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {zones.map((z) => {
          const active = z.id === zone;
          const label = lang === "en" ? z.name : z.nameBn;
          // Collapse long names when inactive (only the active one gets full label)
          const shown = active || label.length <= 8 ? label : label.split(/[\s\/]/)[0];
          return (
            <button
              key={z.id}
              onClick={() => setZone(z.id)}
              className="rounded-[20px] font-bold"
              style={{
                flex: "0 0 auto",
                padding: "5px 12px",
                fontSize: 12,
                border: 0,
                background: active ? (z.color || "#E9C15B") : "rgba(12,12,12,.75)",
                color: active ? "#111" : "rgba(255,255,255,.7)",
                whiteSpace: "nowrap",
              }}
            >
              {shown}
            </button>
          );
        })}
        <div
          className="rounded-[20px] border"
          style={{
            flex: "0 0 auto",
            padding: "5px 10px",
            background: "rgba(12,12,12,.8)",
            borderColor: "rgba(255,255,255,.1)",
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(255,255,255,.5)",
            whiteSpace: "nowrap",
          }}
        >
          {zonePandals.length} {txt.pandals}
        </div>
      </div>

      {/* Bottom overlay */}
      <div
        className="absolute z-[900] left-0 right-0 bottom-0 pt-8"
        style={{
          background:
            "linear-gradient(to top,#111 10%,rgba(15,15,15,.97) 55%,rgba(15,15,15,.5) 80%,transparent 100%)",
          paddingBottom: 92,
        }}
      >
        {nearArs && (
          <button
            onClick={() => {
              // If the map has already focused an Arsalan (any tap on its pin),
              // route the bar to that outlet instead of the best-pick default.
              const target = selArsalanId ? arsalans.find((a) => a.id === selArsalanId) || nearArs : nearArs;
              useApp.getState().reportChosenArsalan(target.id);
              setSelArsalan(target.id);
              go("arsalan");
            }}
            className="flex items-center gap-3 rounded-2xl border"
            style={{
              padding: "14px 22px",
              margin: "0 14px 12px",
              width: "calc(100% - 28px)",
              background: "rgba(10,10,10,.88)",
              backdropFilter: "blur(16px)",
              borderColor: "rgba(233,193,91,.35)",
              display: "flex",
            }}
          >
            <img
              src="/arsalan-logo.png"
              alt=""
              style={{
                width: 36, height: 36, objectFit: "contain",
                filter: "invert(1) hue-rotate(180deg) brightness(1.4) saturate(1.3)", flexShrink: 0,
              }}
            />
            <div className="flex-1 min-w-0 text-left">
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".13em", textTransform: "uppercase", color: "#E9C15B" }}>
                {selArs ? "You picked" : savings > 3 ? `Best pick · ${savings} ${txt.min} faster` : txt.nearest}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f0eeec", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selArs
                  ? `Arsalan ${selArs.shortName} · ${haversineKm(user, selArs).toFixed(1)} km · ${driveMin(haversineKm(user, selArs))} ${txt.min}`
                  : `Arsalan ${nearArs.shortName} · ${nearKm} km · ${nearMin}+${nearWait} ${txt.min}`}
              </div>
            </div>
            <IconRoute />
          </button>
        )}

        <div
          ref={cardRailRef}
          className="flex gap-3 px-3.5 overflow-x-auto"
          style={{ scrollSnapType: "x mandatory", scrollPadding: "0 14px", WebkitOverflowScrolling: "touch" }}
        >
          {zonePandals.map((p, i) => {
            const selected = p.id === selPandalId;
            return (
            <div
              key={p.id}
              data-pandal-id={p.id}
              onClick={() => {
                // First tap on a card = focus (same as map pin). Second tap on
                // an already-focused card = commit and open the sheet.
                if (selected) go("pandal");
                else setSelPandal(p.id);
              }}
              className="flex-none w-[220px] rounded-[18px] overflow-hidden cursor-pointer border"
              style={{
                background: "rgba(255,255,255,.07)",
                borderColor: "rgba(255,255,255,.08)",
                scrollSnapAlign: "center",
              }}
            >
              <div className="h-[120px] relative overflow-hidden" style={{ background: "#1a1a1a" }}>
                <img src={pandalPhoto(p)} alt={p.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(0,0,0,.05),rgba(0,0,0,.4))" }} />
                <div
                  style={{
                    position: "absolute", top: 9, right: 9, width: 26, height: 26, borderRadius: 8,
                    background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: "#fff",
                  }}
                >
                  {i + 1}
                </div>
                <span
                  style={{
                    position: "absolute", bottom: 10, left: 10, padding: "3px 9px", borderRadius: 20,
                    background: "rgba(0,0,0,.5)", fontSize: 10, fontWeight: 600, color: "#fff",
                  }}
                >
                  {crowdWord(p.crowd, lang)}
                </span>
              </div>
              <div className="px-3 pt-2.5 pb-3">
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f0eeec", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {lang === "en" ? p.name : p.nameBn}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)", marginTop: 3 }}>
                  {haversineKm(user, p).toFixed(1)} km · {p.theme}
                </div>
              </div>
            </div>
            );
          })}
          <div
            onClick={() => go("planner")}
            className="flex-none w-[160px] rounded-[18px] border flex flex-col items-center justify-center gap-2 p-4 cursor-pointer"
            style={{
              background: "linear-gradient(135deg,rgba(233,193,91,.18),rgba(184,150,61,.25))",
              borderColor: "rgba(233,193,91,.28)",
              scrollSnapAlign: "center",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#E9C15B" strokeWidth="1.6" />
              <path d="M12 6v6l4 2" stroke="#E9C15B" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f0eeec", textAlign: "center", lineHeight: 1.3 }}>
              {txt.plannerCTA}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
