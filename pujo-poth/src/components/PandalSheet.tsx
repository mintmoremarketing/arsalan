"use client";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";
import { crowdWord, crowdBars, haversineKm, driveMin } from "@/lib/helpers";
import { IconX, IconRoute } from "./icons";
import { useSwipeToClose } from "@/lib/useSwipeToClose";

export default function PandalSheet() {
  const { lang, pandals, arsalans, selPandalId, closingSheet, closePandal, dismissPandal, go, setSelArsalan, user, zones } = useApp();
  const txt = t(lang);
  const { dragY, bind } = useSwipeToClose(dismissPandal);
  const dragging = dragY > 0;
  const p = pandals.find((x) => x.id === selPandalId);
  if (!p) return null;
  const ars = arsalans.find((a) => a.id === p.arsalanId);
  const km = ars ? haversineKm(p, ars).toFixed(1) : "0";
  const min = ars ? driveMin(haversineKm(p, ars)) : 0;
  const zone = zones.find((z) => z.id === p.zoneId);

  return (
    <div className="absolute inset-0 z-20 anim-fade">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,.5)" }} onClick={closePandal} />
      <div
        // Suppress the entrance / exit CSS keyframes while the user is
        // manipulating the sheet by touch — otherwise we get two competing
        // transforms and the sheet visibly jumps.
        className={dragging ? "" : closingSheet === "pandal" ? "anim-sheet-down" : "anim-sheet-up"}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "#191919", borderRadius: "24px 24px 0 0",
          padding: "0 0 36px", maxHeight: "82vh", overflowY: "auto",
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "transform .18s ease-out" : undefined,
          touchAction: "pan-y",
        }}
      >
        {/* Handle strip is the drag target — a fat invisible hit area around
            the visible pill so it's easy to grab. */}
        <div
          {...bind}
          style={{ padding: "10px 0 6px", cursor: "grab", touchAction: "none" }}
        >
          <div style={{ width: 38, height: 4, background: "rgba(255,255,255,.28)", borderRadius: 2, margin: "0 auto 14px" }} />
        </div>
        <div style={{ padding: "0 22px" }}>
          <div className="flex items-start gap-2.5 mb-3.5">
            <div className="flex-1">
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".13em", textTransform: "uppercase", color: "#E9C15B", marginBottom: 5 }}>
                {lang === "en" ? zone?.name : zone?.nameBn}
              </div>
              <h2 style={{ fontSize: 27, fontWeight: 900, margin: 0, lineHeight: 1.1, color: "#f0eeec" }}>
                {lang === "en" ? p.name : p.nameBn}
              </h2>
            </div>
            <button
              onClick={closePandal}
              className="flex-none w-9 h-9 rounded-[10px] border-0 flex items-center justify-center"
              style={{ background: "rgba(255,255,255,.07)" }}
            >
              <IconX />
            </button>
          </div>
          <div className="flex gap-1.5 flex-wrap mb-4">
            <span
              className="flex items-center gap-1.5 rounded-[20px]"
              style={{ padding: "5px 10px", background: "rgba(233,193,91,.15)", fontSize: 12, fontWeight: 700, color: "#E9C15B" }}
            >
              <span className="flex gap-[1.5px] items-end" style={{ height: 12 }}>
                {crowdBars(p.crowd).map((b, i) => (
                  <span key={i} style={{ width: 3, borderRadius: 1, background: b.c, height: b.h }} />
                ))}
              </span>
              {crowdWord(p.crowd, lang)}
            </span>
            <span
              className="rounded-[20px]"
              style={{ padding: "5px 10px", background: "rgba(255,255,255,.07)", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.55)" }}
            >
              {txt.queue} ~{p.queueMin} {txt.min}
            </span>
            <span
              className="rounded-[20px]"
              style={{ padding: "5px 10px", background: "rgba(255,255,255,.07)", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.55)" }}
            >
              {p.theme}
            </span>
          </div>

          {ars && (
            <div className="rounded-2xl border p-4 mb-4" style={{ background: "rgba(233,193,91,.1)", borderColor: "rgba(233,193,91,.22)" }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 flex-none rounded-[12px] flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#E9C15B,#b8963d)" }}
                >
                  <img src="/arsalan-logo.png" alt="" style={{ width: 26, height: 26, objectFit: "contain", filter: "invert(1) brightness(2)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "#E9C15B", marginBottom: 3 }}>
                    {txt.nearest}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#f0eeec" }}>Arsalan {ars.shortName}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 2 }}>
                    {km} km · {min} {txt.min} {txt.byCar} · {txt.openTill}
                  </div>
                </div>
                <div style={{ fontSize: 38, fontWeight: 900, color: "#E9C15B", lineHeight: 1, flexShrink: 0 }}>{km}</div>
              </div>
            </div>
          )}

          <button
            onClick={() => go("route")}
            className="w-full rounded-[14px] border-0 flex items-center justify-center gap-2 mb-2.5"
            style={{ minHeight: 52, background: "#E9C15B", fontSize: 15, fontWeight: 900, color: "#111" }}
          >
            <IconRoute color="#111" />
            {txt.routeCTA}
          </button>
          {ars && (
            <button
              onClick={() => { setSelArsalan(ars.id); go("arsalan"); }}
              className="w-full rounded-[14px] border"
              style={{
                minHeight: 46, background: "transparent",
                borderColor: "rgba(255,255,255,.12)", borderWidth: 1.5,
                fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.55)",
              }}
            >
              {txt.seeOutlet}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
