"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";
import { haversineKm, driveMin, pandalPhoto, crowdWord, crowdBars, buildPlan, fmtTime, googleMapsRoute, pickBestArsalan, navigateUrl } from "@/lib/helpers";
import { MENU_SAMPLE } from "@/lib/seed";
import { IconSearch, IconLocate, IconRoute, IconMapPin } from "./icons";
import CrewCodeBlock from "./CrewCodeBlock";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

type PaneTab = "plan" | "map" | "find" | "group";

export default function DesktopShell() {
  const {
    lang, zones, zone, setZone, pandals, arsalans, user,
    setSelPandal, setSelArsalan, selPandalId,
  } = useApp();
  const txt = t(lang);
  const [pane, setPane] = useState<PaneTab>("map");
  const { startHour, startMin, durMin, setRouteStops, setRouteMode, routeMode } = useApp();
  const zonePandals = pandals.filter((p) => p.zoneId === zone);

  // Compute route stops per pane state.
  // NOTE: don't put zonePandals here — it's a new array every render → infinite loop.
  useEffect(() => {
    const p = pandals.find((x) => x.id === selPandalId);
    if (pane === "plan") {
      const zp = pandals.filter((x) => x.zoneId === zone);
      const plan = buildPlan(zp, arsalans, startHour, startMin, durMin, user, routeMode);
      setRouteStops([{ lat: user.lat, lng: user.lng, label: "You" }, ...plan.map((s) => ({ lat: s.lat, lng: s.lng, label: s.name }))]);
    } else if (pane === "map" && p) {
      const ars = arsalans.find((a) => a.id === p.arsalanId);
      const stops = [{ lat: user.lat, lng: user.lng, label: "You" }, { lat: p.lat, lng: p.lng, label: p.name }];
      if (ars) stops.push({ lat: ars.lat, lng: ars.lng, label: `Arsalan ${ars.shortName}` });
      setRouteStops(stops);
    } else {
      setRouteStops([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pane, selPandalId, zone, startHour, startMin, durMin, routeMode, user.lat, user.lng, pandals, arsalans]);
  const zoneCounts = Object.fromEntries(zones.map((z) => [z.id, pandals.filter((p) => p.zoneId === z.id).length]));
  const liveWaits = useApp((s) => s.liveWaits);
  const pick = pickBestArsalan(user, arsalans, liveWaits);
  const near = pick?.best.arsalan;
  const nearMeta = pick?.best;

  return (
    <div className="fixed inset-0 flex" style={{ background: "#0a0a0a", color: "#f0eeec" }}>
      {/* LEFT SIDEBAR */}
      <div className="w-[272px] flex-none flex flex-col overflow-hidden" style={{ background: "#0f0f0f", borderRight: "1px solid rgba(255,255,255,.06)" }}>
        <div className="px-4 pt-5 pb-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-[34px] h-[34px] rounded-[10px] border flex items-center justify-center" style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,.08)" }}>
              <img src="/arsalan-logo.png" alt="" style={{ width: 26, height: 26, objectFit: "contain", filter: "invert(1) hue-rotate(180deg) brightness(1.4) saturate(1.3)" }} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#f0eeec", lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Arsalan Near Me</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 2, fontWeight: 500 }}>Durga Pujo 2026</div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 rounded-[20px] border" style={{ background: "rgba(76,175,80,.1)", borderColor: "rgba(76,175,80,.2)", padding: "3px 8px" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4caf50" }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: "#4caf50", letterSpacing: ".06em" }}>LIVE</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {zones.map((z) => {
              const active = z.id === zone;
              return (
                <button
                  key={z.id}
                  onClick={() => setZone(z.id)}
                  className="rounded-[10px]"
                  style={{
                    padding: "8px 4px",
                    borderWidth: 1.5, borderStyle: "solid",
                    borderColor: active ? (z.color || "#E9C15B") : "rgba(255,255,255,.08)",
                    background: active ? tint(z.color || "#E9C15B", 0.12) : "transparent",
                    color: active ? (z.color || "#E9C15B") : "rgba(255,255,255,.6)",
                    fontSize: 10, fontWeight: 700, cursor: "pointer",
                    textAlign: "center", lineHeight: 1.15,
                    minWidth: 0, overflow: "hidden",
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 800, color: active ? (z.color || "#E9C15B") : "#f0eeec", lineHeight: 1, marginBottom: 3 }}>
                    {zoneCounts[z.id]}
                  </div>
                  <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {lang === "en" ? z.name : z.nameBn}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div style={{ padding: "10px 18px 6px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.2)" }}>
            Pandals
          </div>
          {zonePandals.map((c) => (
            <div
              key={c.id}
              onClick={() => { setSelPandal(c.id); setPane("map"); }}
              className="flex items-center gap-2.5 cursor-pointer"
              style={{
                padding: "9px 18px",
                borderBottom: "1px solid rgba(255,255,255,.03)",
                background: c.id === selPandalId ? "rgba(233,193,91,.08)" : "transparent",
              }}
            >
              <div className="w-[42px] h-[42px] flex-none rounded-[10px] overflow-hidden relative" style={{ background: "#1a1a1a" }}>
                <img src={pandalPhoto(c)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f0eeec", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {lang === "en" ? c.name : c.nameBn}
                </div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.32)", marginTop: 2 }}>
                  {haversineKm(user, c).toFixed(1)} km · {c.theme}
                </div>
              </div>
              <div className="flex gap-[1.5px] items-end flex-shrink-0" style={{ height: 12 }}>
                {crowdBars(c.crowd).map((b, i) => (
                  <div key={i} style={{ width: 3, borderRadius: 1, background: b.c, height: b.h }} />
                ))}
              </div>
            </div>
          ))}
        </div>
        {near && nearMeta && (
          <div className="p-3.5" style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}>
            <button
              onClick={() => { setSelArsalan(near.id); setPane("map"); setSelPandal(null); }}
              className="w-full flex items-center gap-2.5 rounded-[12px] border"
              style={{ padding: "10px 12px", background: "rgba(233,193,91,.06)", borderColor: "rgba(233,193,91,.15)" }}
            >
              <img src="/arsalan-logo.png" alt="" style={{ width: 26, height: 26, objectFit: "contain", filter: "invert(1) hue-rotate(180deg) brightness(1.4) saturate(1.3)", flexShrink: 0 }} />
              <div className="flex-1 min-w-0 text-left">
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#E9C15B", marginBottom: 1 }}>
                  Best pick for you
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#f0eeec", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {near.shortName} · {nearMeta.km.toFixed(1)} km · {nearMeta.travelMin}+{nearMeta.waitMin} {txt.min}
                </div>
              </div>
              <IconRoute />
            </button>
          </div>
        )}
      </div>

      {/* CENTER MAP */}
      <div className="flex-1 relative">
        <MapView />
        <div className="absolute z-[900] top-4 left-4 right-4 flex gap-2">
          <button
            onClick={() => setPane("find")}
            className="flex-1 flex items-center gap-2.5 rounded-[12px] border text-left"
            style={{ padding: "10px 14px", background: "rgba(10,10,10,.88)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,.08)" }}
          >
            <IconSearch />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,.35)", fontWeight: 500 }}>{txt.searchPH}</span>
          </button>
          <button
            onClick={() => useApp.getState().recenter()}
            className="w-10 h-10 rounded-[12px] border flex items-center justify-center"
            style={{ background: "rgba(10,10,10,.88)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,.08)" }}
          >
            <IconLocate />
          </button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-[380px] flex-none flex flex-col overflow-hidden" style={{ background: "#111", borderLeft: "1px solid rgba(255,255,255,.07)" }}>
        {/* Tab bar */}
        <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,.06)", padding: "0 8px" }}>
          {(["plan", "map", "find", "group"] as PaneTab[]).map((tk) => {
            const active = pane === tk;
            const Icon = TAB_ICONS[tk];
            return (
              <button
                key={tk}
                onClick={() => setPane(tk)}
                className="flex-1 flex flex-col items-center gap-1 py-3 cursor-pointer border-0"
                style={{
                  background: "transparent",
                  borderBottom: active ? "2px solid #E9C15B" : "2px solid transparent",
                  color: active ? "#E9C15B" : "rgba(255,255,255,.4)",
                  transition: "color .15s, border-color .15s",
                }}
              >
                <Icon active={active} />
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".13em", textTransform: "uppercase" }}>
                  {txt.tabs[tk === "plan" ? "plan" : tk === "map" ? "map" : tk === "find" ? "find" : "crew"]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Pane content */}
        <div className="flex-1 overflow-y-auto">
          {pane === "map" && <MapTab />}
          {pane === "plan" && <PlanTab />}
          {pane === "find" && <FindTab />}
          {pane === "group" && <GroupTab />}
        </div>
      </div>
    </div>
  );
}

// ── MAP TAB ─────────────────────────────────────────────────────────────────
function MapTab() {
  const { lang, pandals, arsalans, user, selPandalId, zones, setSelPandal, routeMode, setRouteMode } = useApp();
  const liveWaits = useApp((s) => s.liveWaits);
  const txt = t(lang);
  const p = pandals.find((x) => x.id === selPandalId);
  // Precompute the default-view pick here so all hooks run regardless of branch.
  const pick = pickBestArsalan(user, arsalans, liveWaits);
  const runnerUp = pick && pick.ranked.length > 1 ? pick.ranked[1] : null;

  if (p) {
    const zone = zones.find((z) => z.id === p.zoneId);
    const ars = arsalans.find((a) => a.id === p.arsalanId);
    const km = ars ? haversineKm(p, ars).toFixed(1) : "0";
    const min = ars ? driveMin(haversineKm(p, ars)) : 0;
    return (
      <div>
        <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
          <img src={pandalPhoto(p)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,.9) 0%,rgba(0,0,0,.2) 60%,transparent 100%)" }} />
          <button
            onClick={() => setSelPandal(null)}
            style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: 10, border: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(10px)", color: "#fff", fontSize: 16, cursor: "pointer" }}
          >
            ×
          </button>
          <div style={{ position: "absolute", left: 18, right: 18, bottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".13em", textTransform: "uppercase", color: "#E9C15B", marginBottom: 4 }}>
              {lang === "en" ? zone?.name : zone?.nameBn}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#f0eeec", lineHeight: 1.1 }}>
              {lang === "en" ? p.name : p.nameBn}
            </div>
          </div>
        </div>
        <div style={{ padding: 18 }}>
          <div className="flex gap-1.5 flex-wrap mb-4">
            <Chip gold>
              <span className="flex gap-[1.5px] items-end" style={{ height: 12 }}>
                {crowdBars(p.crowd).map((b, i) => <span key={i} style={{ width: 3, borderRadius: 1, background: b.c, height: b.h }} />)}
              </span>
              &nbsp;{crowdWord(p.crowd, lang)}
            </Chip>
            <Chip>{txt.queue} ~{p.queueMin} {txt.min}</Chip>
            <Chip>{p.theme}</Chip>
          </div>
          {ars && (
            <div className="rounded-2xl border p-4 mb-4" style={{ background: "rgba(233,193,91,.1)", borderColor: "rgba(233,193,91,.22)" }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 flex-none rounded-[12px] flex items-center justify-center" style={{ background: "linear-gradient(135deg,#E9C15B,#b8963d)" }}>
                  <img src="/arsalan-logo.png" alt="" style={{ width: 28, height: 28, objectFit: "contain", filter: "invert(1) brightness(2)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "#E9C15B", marginBottom: 3 }}>
                    {txt.nearest}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#f0eeec" }}>Arsalan {ars.shortName}</div>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", marginTop: 2 }}>
                    {km} km · {min} {txt.min} · {txt.openTill}
                  </div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#E9C15B", lineHeight: 1, flexShrink: 0 }}>{km}</div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-end mb-2">
            <ModePill mode={routeMode} onChange={setRouteMode} />
          </div>
          <button
            onClick={() => {
              const mode = useApp.getState().routeMode;
              const u = useApp.getState().user;
              if (ars) {
                useApp.getState().reportChosenArsalan(ars.id);
                // Multi-stop: user → pandal → Arsalan, in the right travel mode
                window.open(googleMapsRoute([
                  { placeName: "My location", lat: u.lat, lng: u.lng },
                  { placeName: p.placeName, lat: p.lat, lng: p.lng },
                  { placeName: ars.placeName, lat: ars.lat, lng: ars.lng },
                ], mode), "_blank");
              } else {
                // Single-destination navigation from user's location to the pandal
                window.open(navigateUrl(u, { placeName: p.placeName, lat: p.lat, lng: p.lng }, mode), "_blank");
              }
            }}
            className="w-full rounded-[14px] border-0 flex items-center justify-center gap-2"
            style={{ minHeight: 50, background: "#E9C15B", fontSize: 14, fontWeight: 900, color: "#111" }}
          >
            <IconRoute color="#111" />
            Route in Google Maps
          </button>
        </div>
      </div>
    );
  }

  // Default: best Arsalan hero + wait bars + menu (load-balanced)
  const nearest = pick?.best.arsalan
    ? { ...pick.best.arsalan, km: pick.best.km, travelMin: pick.best.travelMin, waitMin: pick.best.waitMin }
    : null;
  if (!nearest) return null;
  const hour = new Date().getHours();
  const waitBars = Array.from({ length: 8 }).map((_, i) => {
    const hr = 17 + i;
    const h = 20 + Math.round(30 * Math.abs(Math.sin(i + 1)));
    return { h, gold: hr === hour };
  });
  return (
    <div>
      <div style={{ position: "relative", height: 200, overflow: "hidden", background: "#1a1a1a" }}>
        <img
          src={nearest.photoUrl || `https://picsum.photos/seed/${encodeURIComponent(nearest.name)}/700/400`}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,.9) 0%,rgba(0,0,0,.2) 60%,transparent 100%)" }} />
        <div style={{ position: "absolute", left: 18, right: 18, bottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".13em", textTransform: "uppercase", color: "#E9C15B", marginBottom: 4 }}>
            {runnerUp && runnerUp.totalMin - (pick!.best.totalMin) > 3
              ? `Best pick · ${runnerUp.totalMin - pick!.best.totalMin} min faster overall`
              : "Best pick for you"}
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#f0eeec", lineHeight: 1.1 }}>Arsalan {nearest.shortName}</div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.7)", marginTop: 4 }}>
            {nearest.km.toFixed(1)} km · {nearest.travelMin} min drive + {nearest.waitMin} min wait
          </div>
        </div>
      </div>
      <div style={{ padding: 18 }}>
        <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,.05)" }}>
          <div className="flex items-end gap-3 mb-2">
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.35)" }}>{txt.tableWait}</div>
              <div style={{ fontSize: 44, fontWeight: 900, color: "#E9C15B", lineHeight: 1, marginTop: 4 }}>{liveWaits[nearest.id] ?? nearest.waitMin}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{txt.minutes}</div>
            </div>
            <div className="flex-1 flex items-end gap-[3px]" style={{ height: 46 }}>
              {waitBars.map((b, i) => (
                <div key={i} className="flex-1" style={{ borderRadius: "3px 3px 0 0", background: b.gold ? "#E9C15B" : "rgba(233,193,91,.28)", height: b.h }} />
              ))}
            </div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 8 }}>
            Tonight 7 pm – midnight
          </div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.35)", marginBottom: 10 }}>
          {txt.peopleOrder}
        </div>
        {MENU_SAMPLE.map((m) => (
          <div key={m.n} className="flex items-center py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#f0eeec", flex: 1 }}>{m.n}</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: "#E9C15B" }}>{m.price}</span>
          </div>
        ))}
        <div className="flex items-center justify-end mt-4 mb-2">
          <ModePill mode={routeMode} onChange={setRouteMode} />
        </div>
        <button
          onClick={() => {
            useApp.getState().reportChosenArsalan(nearest.id);
            const mode = useApp.getState().routeMode;
            const u = useApp.getState().user;
            window.open(navigateUrl(u, { placeName: nearest.placeName, lat: nearest.lat, lng: nearest.lng }, mode), "_blank");
          }}
          className="w-full rounded-[14px] border-0 flex items-center justify-center gap-2"
          style={{ minHeight: 50, background: "#E9C15B", fontSize: 14, fontWeight: 900, color: "#111" }}
        >
          <IconRoute color="#111" />
          Route to Arsalan
        </button>
      </div>
    </div>
  );
}

// ── PLAN TAB ────────────────────────────────────────────────────────────────
function PlanTab() {
  const {
    lang, pandals, arsalans, user, zone, startHour, startMin, durMin,
    incStartH, incMinTens, incMinUnits, setAP, incDur, routeMode, setRouteMode,
  } = useApp();
  const txt = t(lang);
  const h12 = ((startHour + 11) % 12) + 1;
  const minTens = Math.floor(startMin / 10);
  const minUnits = startMin % 10;
  const ap = startHour < 12 ? "AM" : "PM";
  const plan = useMemo(
    () => buildPlan(pandals.filter((p) => p.zoneId === zone), arsalans, startHour, startMin, durMin, user, routeMode),
    [pandals, arsalans, zone, startHour, startMin, durMin, user, routeMode]
  );
  const endMinTotal = startHour * 60 + startMin + durMin;
  const durH = Math.floor(durMin / 60);
  const durM = durMin % 60;
  const durDisplay = durM ? `${durH}:${String(durM).padStart(2, "0")}` : `${durH}h`;
  const pandalCount = plan.filter((s) => s.kind === "pandal").length;

  return (
    <div style={{ padding: 18 }}>
      <div className="flex items-center mb-3">
        <div style={{ fontSize: 15, fontWeight: 800, color: "#f0eeec" }}>Plan my evening</div>
        <div className="ml-auto flex" style={{ background: "rgba(255,255,255,.06)", borderRadius: 10, padding: 3 }}>
          <button onClick={() => setRouteMode("driving")} style={{ padding: "5px 10px", border: 0, borderRadius: 8, fontSize: 10.5, fontWeight: 800, cursor: "pointer", background: routeMode === "driving" ? "#E9C15B" : "transparent", color: routeMode === "driving" ? "#111" : "rgba(255,255,255,.5)" }}>Drive</button>
          <button onClick={() => setRouteMode("walking")} style={{ padding: "5px 10px", border: 0, borderRadius: 8, fontSize: 10.5, fontWeight: 800, cursor: "pointer", background: routeMode === "walking" ? "#E9C15B" : "transparent", color: routeMode === "walking" ? "#111" : "rgba(255,255,255,.5)" }}>Walk</button>
        </div>
      </div>
      <div className="rounded-[14px] border p-3.5 mb-4" style={{ background: "rgba(255,255,255,.03)", borderColor: "rgba(255,255,255,.06)" }}>
        <div className="flex gap-3">
          <div className="flex-1">
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.28)", marginBottom: 10 }}>Start time</div>
            <div className="flex items-center gap-1">
              <MiniDrum value={h12} onUp={() => incStartH(1)} onDown={() => incStartH(-1)} w={28} />
              <span style={{ fontSize: 22, fontWeight: 800, color: "#E9C15B" }}>:</span>
              <MiniDrum value={minTens} onUp={() => incMinTens(1)} onDown={() => incMinTens(-1)} w={22} />
              <MiniDrum value={minUnits} onUp={() => incMinUnits(1)} onDown={() => incMinUnits(-1)} w={22} />
              <div className="flex flex-col gap-1 ml-1">
                <button onClick={() => setAP("AM")} className="rounded-md" style={{ padding: "3px 6px", border: 0, fontSize: 9, fontWeight: 700, background: ap === "AM" ? "#E9C15B" : "rgba(255,255,255,.07)", color: ap === "AM" ? "#111" : "rgba(255,255,255,.4)" }}>AM</button>
                <button onClick={() => setAP("PM")} className="rounded-md" style={{ padding: "3px 6px", border: 0, fontSize: 9, fontWeight: 700, background: ap === "PM" ? "#E9C15B" : "rgba(255,255,255,.07)", color: ap === "PM" ? "#111" : "rgba(255,255,255,.4)" }}>PM</button>
              </div>
            </div>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,.07)" }} />
          <div style={{ minWidth: 68 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.28)", marginBottom: 10 }}>Duration</div>
            <div className="flex flex-col items-center gap-1">
              <button onClick={() => incDur(1)} className="rounded-md" style={{ width: 44, height: 20, border: 0, background: "rgba(233,193,91,.15)", color: "#E9C15B", fontSize: 10 }}>▲</button>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#f0eeec" }}>{durDisplay}</div>
              <button onClick={() => incDur(-1)} className="rounded-md" style={{ width: 44, height: 20, border: 0, background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.5)", fontSize: 10 }}>▼</button>
            </div>
          </div>
        </div>
      </div>

      {plan.map((s, i) => {
        const isAr = s.kind === "arsalan";
        return (
          <div
            key={s.id + i}
            className="rounded-[14px] border p-3 mb-2 flex items-center gap-3 relative overflow-hidden"
            style={{
              background: isAr ? "rgba(233,193,91,.1)" : "rgba(255,255,255,.04)",
              borderColor: isAr ? "rgba(233,193,91,.28)" : "rgba(255,255,255,.06)",
            }}
          >
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: isAr ? "#E9C15B" : "rgba(255,255,255,.15)" }} />
            <div
              className="w-9 h-9 flex-none rounded-[10px] flex items-center justify-center"
              style={{ background: isAr ? "linear-gradient(135deg,#E9C15B,#b8963d)" : "rgba(255,255,255,.06)" }}
            >
              {isAr
                ? <img src="/arsalan-logo.png" alt="" style={{ width: 22, height: 22, objectFit: "contain", filter: "invert(1) brightness(2)" }} />
                : <span style={{ fontSize: 12, fontWeight: 800, color: "#f0eeec" }}>{plan.slice(0, i + 1).filter((x) => x.kind === "pandal").length}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f0eeec", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{s.time} · {s.durMin} min</div>
            </div>
          </div>
        );
      })}

      <div className="rounded-[14px] p-3.5 mt-3 mb-4" style={{ background: "rgba(233,193,91,.08)", border: "1px solid rgba(233,193,91,.2)" }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.35)" }}>
          Wrap-up time
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#E9C15B", marginTop: 4 }}>
          {pandalCount} pandals · ending ~{fmtTime(endMinTotal)}
        </div>
      </div>

      <button
        onClick={() => plan.length && window.open(
          googleMapsRoute(
            [{ placeName: "My location", lat: user.lat, lng: user.lng }, ...plan],
            routeMode
          ),
          "_blank"
        )}
        className="w-full rounded-[14px] border-0 gold-shimmer flex items-center justify-center gap-2"
        style={{ minHeight: 50, fontSize: 14, fontWeight: 900, color: "#111" }}
      >
        <IconRoute color="#111" />
        Open full trip in Google Maps
      </button>
    </div>
  );
}

// ── FIND TAB ────────────────────────────────────────────────────────────────
function FindTab() {
  const { lang, q, setQ, pandals, user, zones, setSelPandal } = useApp();
  const txt = t(lang);
  const [active, setActive] = useState<string | null>(null);
  const FILTERS = ["chill", "packed", "themed", "short queue"];
  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    return pandals
      .filter((p) => {
        const hitQ = !query || p.name.toLowerCase().includes(query) || p.nameBn.includes(query) || p.theme.toLowerCase().includes(query);
        const hitF = !active || (active === "chill" && p.crowd <= 2) || (active === "packed" && p.crowd >= 4) || (active === "themed" && p.theme.length > 0) || (active === "short queue" && p.queueMin <= 25);
        return hitQ && hitF;
      })
      .map((p) => ({ ...p, km: haversineKm(user, p) }))
      .sort((a, b) => a.km - b.km);
  }, [q, active, pandals, user]);

  return (
    <div style={{ padding: 18 }}>
      <div className="flex items-center gap-2.5 rounded-[13px] mb-3" style={{ background: "rgba(255,255,255,.07)", padding: "10px 14px" }}>
        <IconSearch />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={txt.searchPH}
          style={{ flex: 1, background: "transparent", border: 0, outline: 0, fontSize: 13, fontWeight: 600, color: "#f0eeec" }}
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
                padding: "5px 12px", borderWidth: 1.5, borderStyle: "solid",
                borderColor: on ? "#E9C15B" : "rgba(255,255,255,.12)",
                background: on ? "rgba(233,193,91,.18)" : "transparent",
                color: on ? "#E9C15B" : "rgba(255,255,255,.6)",
                fontSize: 11, fontWeight: 800, cursor: "pointer",
              }}
            >
              {f}
            </button>
          );
        })}
      </div>
      {results.map((r) => {
        const z = zones.find((x) => x.id === r.zoneId);
        return (
          <button
            key={r.id}
            onClick={() => setSelPandal(r.id)}
            className="flex w-full gap-3 items-center py-2.5 text-left border-0"
            style={{ background: "transparent", borderBottom: "1px solid rgba(255,255,255,.06)" }}
          >
            <div className="w-9 h-9 flex-none rounded-[10px] flex items-center justify-center" style={{ background: "rgba(233,193,91,.14)" }}>
              <IconMapPin />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "#f0eeec", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {lang === "en" ? r.name : r.nameBn}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)", marginTop: 2 }}>
                {lang === "en" ? z?.name : z?.nameBn} · {crowdWord(r.crowd, lang)}
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#E9C15B" }}>{r.km.toFixed(1)} km</div>
          </button>
        );
      })}
    </div>
  );
}

// ── GROUP TAB ───────────────────────────────────────────────────────────────
function GroupTab() {
  const { lang, identity, share, setShare, friends, saveIdentity, editingIdentity, setEditingIdentity, resetIdentity } = useApp();
  const txt = t(lang);
  const [name, setName] = useState(identity?.name || "");
  const [color, setColor] = useState(identity?.color || "#E9C15B");
  const COLORS = ["#E9C15B", "#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f97316", "#06b6d4", "#ec4899", "#84cc16", "#f59e0b", "#14b8a6", "#6366f1", "#f43f5e", "#8b5cf6", "#10b981", "#0ea5e9"];
  const needsSetup = !identity || editingIdentity;

  if (needsSetup) {
    return (
      <div style={{ padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#f0eeec", marginBottom: 4 }}>Set your dot</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 16 }}>
          Pick a name and colour. Friends see this on the map.
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={10}
          placeholder="Your name"
          style={{ width: "100%", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: "10px 14px", fontSize: 14, fontWeight: 700, color: "#f0eeec", outline: "none", marginBottom: 14 }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 8, marginBottom: 16 }}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ width: 32, height: 32, borderRadius: "50%", background: c, border: `3px solid ${color === c ? "#fff" : "transparent"}`, cursor: "pointer" }}
            />
          ))}
        </div>
        <button
          onClick={() => name.trim() && saveIdentity(name.trim(), color)}
          className="w-full rounded-[12px] border-0 gold-shimmer"
          style={{ minHeight: 44, fontSize: 14, fontWeight: 800, color: "#111" }}
        >
          Save & Share My Dot
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 18 }}>
      <div className="flex items-center gap-3 rounded-2xl border p-3 mb-3" style={{ background: "rgba(255,255,255,.05)", borderColor: "rgba(255,255,255,.07)" }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: identity!.color, fontSize: 12, fontWeight: 800, color: "#111" }}>
          {identity!.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f0eeec" }}>{identity!.name}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{share ? "is sharing" : "not sharing"}</div>
        </div>
        <button
          onClick={() => setShare(!share)}
          style={{ width: 42, height: 26, border: 0, padding: 0, borderRadius: 13, background: share ? "#E9C15B" : "rgba(255,255,255,.15)", position: "relative", cursor: "pointer" }}
        >
          <div style={{ position: "absolute", top: 4, left: share ? 20 : 4, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3" style={{ marginBottom: 12 }}>
        <button onClick={() => setEditingIdentity(true)} style={{ background: "transparent", border: 0, fontSize: 11, color: "rgba(255,255,255,.35)", textDecoration: "underline", cursor: "pointer" }}>
          Edit name or colour
        </button>
        <button onClick={() => confirm("Reset your identity? This deletes your name & colour from this device and Supabase.") && resetIdentity()} style={{ background: "transparent", border: 0, fontSize: 11, color: "#ff8a8a", textDecoration: "underline", cursor: "pointer" }}>
          Reset identity
        </button>
      </div>
      <CrewCodeBlock />
      {friends.length === 0 && (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", padding: "8px 0" }}>
          No friends sharing yet. Send them the crew code above.
        </div>
      )}
      {friends.map((f) => (
        <div key={f.id} className="flex items-center gap-3 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
          <div className="w-10 h-10 flex-none rounded-[12px] flex items-center justify-center" style={{ background: `${f.color}22` }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: f.color }} />
          </div>
          <div className="flex-1">
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f0eeec" }}>{f.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{f.at}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Small helpers ───────────────────────────────────────────────────────────
// Hex `#rrggbb` → `rgba(r, g, b, alpha)` for tinted backgrounds
function tint(hex: string, alpha: number) {
  const c = hex.replace("#", "");
  if (c.length !== 6) return `rgba(233,193,91,${alpha})`;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function ModePill({ mode, onChange }: { mode: "driving" | "walking"; onChange: (m: "driving" | "walking") => void }) {
  return (
    <div className="flex" style={{ background: "rgba(255,255,255,.06)", borderRadius: 8, padding: 2 }}>
      <button
        onClick={() => onChange("driving")}
        style={{ padding: "4px 10px", border: 0, borderRadius: 6, fontSize: 10.5, fontWeight: 800, cursor: "pointer", background: mode === "driving" ? "#E9C15B" : "transparent", color: mode === "driving" ? "#111" : "rgba(255,255,255,.5)" }}
      >Drive</button>
      <button
        onClick={() => onChange("walking")}
        style={{ padding: "4px 10px", border: 0, borderRadius: 6, fontSize: 10.5, fontWeight: 800, cursor: "pointer", background: mode === "walking" ? "#E9C15B" : "transparent", color: mode === "walking" ? "#111" : "rgba(255,255,255,.5)" }}
      >Walk</button>
    </div>
  );
}

function Chip({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <span
      className="rounded-[20px] flex items-center"
      style={{
        padding: "5px 10px",
        background: gold ? "rgba(233,193,91,.15)" : "rgba(255,255,255,.07)",
        fontSize: 11.5, fontWeight: 700,
        color: gold ? "#E9C15B" : "rgba(255,255,255,.55)",
      }}
    >
      {children}
    </span>
  );
}

function MiniDrum({ value, onUp, onDown, w }: { value: number; onUp: () => void; onDown: () => void; w: number }) {
  return (
    <div className="flex flex-col items-center gap-[2px]">
      <button onClick={onUp} onWheel={(e) => (e.deltaY < 0 ? onUp() : onDown())} style={{ width: w, height: 18, border: 0, borderRadius: 5, background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.45)", fontSize: 9, cursor: "pointer" }}>▲</button>
      <div onWheel={(e) => (e.deltaY < 0 ? onUp() : onDown())} style={{ fontSize: 22, fontWeight: 800, color: "#f0eeec", minWidth: w - 4, textAlign: "center", cursor: "ns-resize", lineHeight: 1 }}>
        {String(value).padStart(1, "0")}
      </div>
      <button onClick={onDown} style={{ width: w, height: 18, border: 0, borderRadius: 5, background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.45)", fontSize: 9, cursor: "pointer" }}>▼</button>
    </div>
  );
}

const TAB_ICONS = {
  plan: ({ active }: { active: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={active ? "#E9C15B" : "rgba(255,255,255,.4)"} strokeWidth="1.6" />
      <path d="M12 7v5l3 2" stroke={active ? "#E9C15B" : "rgba(255,255,255,.4)"} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  map: ({ active }: { active: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2a7 7 0 0 1 7 7c0 4.5-7 13-7 13S5 13.5 5 9a7 7 0 0 1 7-7z" stroke={active ? "#E9C15B" : "rgba(255,255,255,.4)"} strokeWidth="1.6" />
      <circle cx="12" cy="9" r="2.5" fill={active ? "#E9C15B" : "rgba(255,255,255,.4)"} />
    </svg>
  ),
  find: ({ active }: { active: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke={active ? "#E9C15B" : "rgba(255,255,255,.4)"} strokeWidth="1.6" />
      <path d="M16.5 16.5L21 21" stroke={active ? "#E9C15B" : "rgba(255,255,255,.4)"} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  group: ({ active }: { active: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="10" r="3.2" stroke={active ? "#E9C15B" : "rgba(255,255,255,.4)"} strokeWidth="1.6" />
      <circle cx="16" cy="12" r="2.5" stroke={active ? "#E9C15B" : "rgba(255,255,255,.4)"} strokeWidth="1.6" />
      <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5M15 19c0-2 1.7-3.5 4-3.5" stroke={active ? "#E9C15B" : "rgba(255,255,255,.4)"} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};
