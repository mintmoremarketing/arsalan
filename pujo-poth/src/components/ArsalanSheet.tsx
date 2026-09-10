"use client";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";
import { haversineKm } from "@/lib/helpers";
import { MENU_SAMPLE } from "@/lib/seed";
import { IconRoute } from "./icons";
import { useSwipeToClose } from "@/lib/useSwipeToClose";

export default function ArsalanSheet() {
  const { lang, arsalans, selArsalanId, closingSheet, closeArsalan, dismissArsalan, go, user, friends } = useApp();
  const txt = t(lang);
  const { dragY, bind } = useSwipeToClose(dismissArsalan);
  const dragging = dragY > 0;
  const a = arsalans.find((x) => x.id === selArsalanId);
  if (!a) return null;
  const km = haversineKm(user, a).toFixed(1);
  const liveUsers = friends.filter((f) => haversineKm(f, a) < 0.15).length;

  // 8 wait bars — current hour highlighted
  const now = new Date().getHours();
  const waitBars = Array.from({ length: 8 }).map((_, i) => {
    const hr = 17 + i; // 5pm-midnight
    const h = 20 + Math.round(30 * Math.abs(Math.sin(i)));
    const isNow = hr === now;
    return { h: `${h}px`, c: isNow ? "#E9C15B" : "rgba(233,193,91,.28)" };
  });

  return (
    <div className="absolute inset-0 z-20 anim-fade">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,.55)" }} onClick={closeArsalan} />
      <div
        className={dragging ? "" : closingSheet === "arsalan" ? "anim-sheet-down" : "anim-sheet-up"}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "#191919", borderRadius: "24px 24px 0 0",
          padding: "0 0 110px", maxHeight: "90vh", overflowY: "auto",
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "transform .18s ease-out" : undefined,
          touchAction: "pan-y",
        }}
      >
        <div {...bind} style={{ padding: "10px 0 6px", cursor: "grab", touchAction: "none" }}>
          <div style={{ width: 38, height: 4, background: "rgba(255,255,255,.28)", borderRadius: 2, margin: "0 auto 14px" }} />
        </div>
        <div style={{ padding: "0 22px" }}>
          <div className="flex items-center gap-3 mb-5">
            <div
              className="flex-none w-[52px] h-[52px] rounded-[14px] border flex items-center justify-center"
              style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,.08)" }}
            >
              <img
                src="/arsalan-logo.png"
                alt=""
                style={{ width: 44, height: 44, objectFit: "contain", filter: "invert(1) hue-rotate(180deg) brightness(1.4) saturate(1.3)" }}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".13em", textTransform: "uppercase", color: "#E9C15B", marginBottom: 4 }}>
                {txt.theStop}
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: "#f0eeec" }}>Arsalan {a.shortName}</h2>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.38)", marginTop: 2 }}>
                {km} km · {txt.openTill}
              </div>
            </div>
          </div>
          <div className="rounded-2xl p-[18px] mb-4" style={{ background: "rgba(255,255,255,.05)" }}>
            <div className="flex items-end gap-4 mb-3">
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.35)" }}>
                  {txt.tableWait}
                </div>
                <div style={{ fontSize: 56, fontWeight: 900, color: "#E9C15B", lineHeight: 1, marginTop: 4 }}>{a.waitMin}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>{txt.minutes}</div>
              </div>
              <div className="flex-1 flex items-end gap-[3px]" style={{ height: 52 }}>
                {waitBars.map((b, i) => (
                  <div key={i} className="flex-1" style={{ borderRadius: "3px 3px 0 0", background: b.c, height: b.h }} />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)" }}>{txt.crowdNow}</div>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4caf50", boxShadow: "0 0 6px rgba(76,175,80,.8)" }} />
                <div style={{ fontSize: 11, fontWeight: 700, color: "#4caf50" }}>{liveUsers} here now</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.35)", marginBottom: 10 }}>
            {txt.peopleOrder}
          </div>
          {MENU_SAMPLE.map((m) => (
            <div key={m.n} className="flex items-center py-3" style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#f0eeec", flex: 1 }}>{m.n}</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: "#E9C15B" }}>{m.price}</span>
            </div>
          ))}
          <button
            onClick={() => go("route")}
            className="w-full rounded-[14px] border-0 flex items-center justify-center gap-2 mt-6"
            style={{ minHeight: 52, background: "#E9C15B", fontSize: 15, fontWeight: 900, color: "#111" }}
          >
            <IconRoute color="#111" />
            {txt.routeCTA}
          </button>
        </div>
      </div>
    </div>
  );
}
