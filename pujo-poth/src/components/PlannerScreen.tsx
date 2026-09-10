"use client";
import { useEffect, useMemo } from "react";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";
import { buildPlan, fmtTime, googleMapsRoute } from "@/lib/helpers";
import { IconBack } from "./icons";
import dynamic from "next/dynamic";
const RouteMapPreview = dynamic(() => import("./RouteMapPreview"), { ssr: false });

const Chevron = ({ up = true, dim = false }: { up?: boolean; dim?: boolean }) => (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
    <path d={up ? "M1 5l4-4 4 4" : "M1 1l4 4 4-4"} stroke={dim ? "rgba(233,193,91,1)" : "rgba(255,255,255,.45)"} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export default function PlannerScreen() {
  const {
    lang, back, startHour, startMin, durMin, zone, pandals, arsalans, user,
    incStartH, incMinTens, incMinUnits, setAP, incDur, routeMode, setRouteMode,
    setRouteStops,
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
  // Publish the plan to the shared route store so the mini-map can draw it,
  // and clear on unmount so the main map's polyline resets afterwards.
  useEffect(() => {
    setRouteStops([
      { lat: user.lat, lng: user.lng, label: "You" },
      ...plan.map((s) => ({ lat: s.lat, lng: s.lng, label: s.name })),
    ]);
    return () => setRouteStops([]);
  }, [plan, user.lat, user.lng, setRouteStops]);
  const endMinTotal = startHour * 60 + startMin + durMin;
  const summary = `${fmtTime(startHour * 60 + startMin)} → ${fmtTime(endMinTotal)}`;
  const durH = Math.floor(durMin / 60);
  const durM = durMin % 60;
  const durDisplay = `${durH}${durM ? `:${String(durM).padStart(2, "0")}` : "h"}`;

  const launch = () => {
    if (!plan.length) return;
    // Start the multi-stop navigation from user's live location, in the
    // chosen drive/walk mode. Reporting the Arsalan stop nudges the picker
    // for everyone else.
    const arsStop = plan.find((s) => s.kind === "arsalan");
    if (arsStop) useApp.getState().reportChosenArsalan(arsStop.id);
    window.open(
      googleMapsRoute(
        [{ placeName: "My location", lat: user.lat, lng: user.lng }, ...plan],
        routeMode
      ),
      "_blank"
    );
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col anim-fade" style={{ background: "#111" }}>
      <div className="flex-none px-5" style={{ paddingTop: "calc(14px + env(safe-area-inset-top, 0px))", paddingBottom: 16 }}>
        <div className="flex items-center gap-2.5 mb-5">
          <button
            onClick={back}
            className="w-9 h-9 rounded-[11px] border-0 flex items-center justify-center"
            style={{ background: "rgba(255,255,255,.06)" }}
          >
            <IconBack />
          </button>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#f0eeec" }}>{txt.plannerTitle}</h2>
          <div className="ml-auto flex" style={{ background: "rgba(255,255,255,.06)", borderRadius: 10, padding: 3 }}>
            <button
              onClick={() => setRouteMode("driving")}
              style={{
                padding: "6px 10px", border: 0, borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer",
                background: routeMode === "driving" ? "#E9C15B" : "transparent",
                color: routeMode === "driving" ? "#111" : "rgba(255,255,255,.5)",
              }}
            >Drive</button>
            <button
              onClick={() => setRouteMode("walking")}
              style={{
                padding: "6px 10px", border: 0, borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer",
                background: routeMode === "walking" ? "#E9C15B" : "transparent",
                color: routeMode === "walking" ? "#111" : "rgba(255,255,255,.5)",
              }}
            >Walk</button>
          </div>
        </div>
        <div className="rounded-[18px] border p-4" style={{ background: "rgba(255,255,255,.04)", borderColor: "rgba(255,255,255,.06)" }}>
          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.28)", marginBottom: 12 }}>
                {txt.startTime}
              </div>
              <div className="flex items-center gap-[5px]">
                <Drum value={h12} onUp={() => incStartH(1)} onDown={() => incStartH(-1)} w={34} />
                <span style={{ fontSize: 28, fontWeight: 800, color: "#E9C15B", lineHeight: 1, alignSelf: "center" }}>:</span>
                <Drum value={minTens} onUp={() => incMinTens(1)} onDown={() => incMinTens(-1)} w={28} />
                <Drum value={minUnits} onUp={() => incMinUnits(1)} onDown={() => incMinUnits(-1)} w={28} />
                <div className="flex flex-col gap-1 ml-0.5 self-center">
                  <button
                    onClick={() => setAP("AM")}
                    className="rounded-lg"
                    style={{ padding: "5px 8px", border: 0, fontSize: 10, fontWeight: 700, background: ap === "AM" ? "#E9C15B" : "rgba(255,255,255,.07)", color: ap === "AM" ? "#111" : "rgba(255,255,255,.4)" }}
                  >
                    AM
                  </button>
                  <button
                    onClick={() => setAP("PM")}
                    className="rounded-lg"
                    style={{ padding: "5px 8px", border: 0, fontSize: 10, fontWeight: 700, background: ap === "PM" ? "#E9C15B" : "rgba(255,255,255,.07)", color: ap === "PM" ? "#111" : "rgba(255,255,255,.4)" }}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,.07)", alignSelf: "stretch" }} />
            <div style={{ flex: "0 0 auto", minWidth: 76 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.28)", marginBottom: 12 }}>
                {txt.duration}
              </div>
              <div className="flex flex-col items-center gap-[3px]">
                <button
                  onClick={() => incDur(1)}
                  className="w-11 h-[22px] rounded-[7px] border-0 flex items-center justify-center"
                  style={{ background: "rgba(233,193,91,.15)" }}
                >
                  <Chevron up dim />
                </button>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#f0eeec", lineHeight: 1 }}>{durDisplay}</div>
                <button
                  onClick={() => incDur(-1)}
                  className="w-11 h-[22px] rounded-[7px] border-0 flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,.07)" }}
                >
                  <Chevron up={false} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-2">
        {plan.length > 0 && (
          <div className="mb-3">
            <RouteMapPreview height={160} />
          </div>
        )}
        {plan.map((s, i) => {
          const isAr = s.kind === "arsalan";
          return (
            <div key={s.id + i} className="mb-2">
              <div
                className="rounded-[18px] border p-3.5 flex items-center gap-3.5 relative overflow-hidden"
                style={{
                  background: isAr ? "rgba(233,193,91,.1)" : "rgba(255,255,255,.04)",
                  borderColor: isAr ? "rgba(233,193,91,.28)" : "rgba(255,255,255,.06)",
                }}
              >
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: isAr ? "#E9C15B" : "rgba(255,255,255,.15)" }} />
                <div
                  className="w-11 h-11 flex-none rounded-[13px] flex items-center justify-center"
                  style={{ background: isAr ? "linear-gradient(135deg,#E9C15B,#b8963d)" : "rgba(255,255,255,.06)" }}
                >
                  {isAr ? (
                    <img src="/arsalan-logo.png" alt="" style={{ width: 24, height: 24, objectFit: "contain", filter: "invert(1) brightness(2)" }} />
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#f0eeec" }}>{i + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#f0eeec", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.32)", marginTop: 2 }}>{s.detail}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div style={{ fontSize: 13, fontWeight: 700, color: isAr ? "#E9C15B" : "#f0eeec" }}>{s.time}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.22)", marginTop: 1 }}>{s.durMin}m</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-none px-5" style={{ background: "#111", borderTop: "1px solid rgba(255,255,255,.05)", padding: "12px 20px 88px" }}>
        <div className="flex items-center justify-between mb-2.5">
          <span style={{ fontSize: 11.5, fontWeight: 500, color: "rgba(255,255,255,.3)" }}>{txt.wrapUp}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#E9C15B" }}>{summary}</span>
        </div>
        <button
          onClick={launch}
          className="w-full rounded-[14px] border-0 gold-shimmer flex items-center justify-center gap-2"
          style={{ minHeight: 52, fontSize: 15, fontWeight: 700, color: "#111" }}
        >
          {txt.openFullTrip}
        </button>
      </div>
    </div>
  );
}

function Drum({ value, onUp, onDown, w }: { value: number | string; onUp: () => void; onDown: () => void; w: number }) {
  return (
    <div className="flex flex-col items-center gap-[3px]">
      <button
        onClick={onUp}
        onWheel={(e) => (e.deltaY < 0 ? onUp() : onDown())}
        className="rounded-[7px] border-0 flex items-center justify-center"
        style={{ width: w, height: 22, background: "rgba(255,255,255,.07)" }}
      >
        <Chevron up />
      </button>
      <div
        onWheel={(e) => (e.deltaY < 0 ? onUp() : onDown())}
        style={{ fontSize: 32, fontWeight: 800, color: "#f0eeec", lineHeight: 1, minWidth: w - 4, textAlign: "center", cursor: "ns-resize" }}
      >
        {typeof value === "number" && value < 10 ? String(value).padStart(1, "0") : value}
      </div>
      <button
        onClick={onDown}
        className="rounded-[7px] border-0 flex items-center justify-center"
        style={{ width: w, height: 22, background: "rgba(255,255,255,.07)" }}
      >
        <Chevron up={false} />
      </button>
    </div>
  );
}
