"use client";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";
import { haversineKm, driveMin, navigateUrl } from "@/lib/helpers";
import { IconBack } from "./icons";

export default function RouteScreen() {
  const { lang, back, pandals, arsalans, selPandalId, selArsalanId, user, routeMode, reportChosenArsalan } = useApp();
  const txt = t(lang);
  const p = pandals.find((x) => x.id === selPandalId);
  const a =
    arsalans.find((x) => x.id === selArsalanId) ||
    arsalans.find((x) => x.id === p?.arsalanId) ||
    arsalans[0];
  const from = p || { name: "Your location", lat: user.lat, lng: user.lng, placeName: "Kolkata" };
  const km = a ? haversineKm(from, a).toFixed(1) : "0";
  const min = a ? driveMin(haversineKm(from, a)) : 0;
  const wait = a?.waitMin ?? 20;
  const photo = a?.photoUrl || `https://picsum.photos/seed/${encodeURIComponent(a?.name || "arsalan")}/800/600`;

  const openMaps = () => {
    if (!a) return;
    reportChosenArsalan(a.id);
    // Turn-by-turn navigation from the user's live location to the Arsalan,
    // honoring the drive / walk toggle from the store.
    window.open(
      navigateUrl(
        { lat: user.lat, lng: user.lng },
        { placeName: a.placeName, lat: a.lat, lng: a.lng },
        routeMode
      ),
      "_blank"
    );
  };

  return (
    <div className="absolute inset-0 z-[25] flex flex-col anim-fade">
      <div className="flex-1 relative overflow-hidden flex flex-col justify-end" style={{ padding: "40px 28px 36px" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${photo})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,.85) 0%,rgba(0,0,0,.3) 50%,rgba(0,0,0,.15) 100%)" }} />
        <div style={{ position: "absolute", top: -80, right: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />
        <button
          onClick={back}
          className="w-[38px] h-[38px] rounded-[12px] border flex items-center justify-center"
          style={{
            position: "absolute", top: 70, left: 22, zIndex: 2,
            background: "rgba(0,0,0,.45)", backdropFilter: "blur(10px)",
            borderColor: "rgba(255,255,255,.1)",
          }}
        >
          <IconBack />
        </button>
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(255,255,255,.6)", marginBottom: 12 }}>
            {txt.handingOver}
          </div>
          <div style={{ fontSize: 100, fontWeight: 900, color: "#E9C15B", lineHeight: 0.9, letterSpacing: "-.04em", textShadow: "0 4px 24px rgba(0,0,0,.5)" }}>
            {km}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.65)", marginTop: 12, letterSpacing: ".06em", textTransform: "uppercase" }}>
            {txt.kmBiryani}
          </div>
        </div>
      </div>
      <div style={{ background: "#191919", padding: "24px 24px 36px", borderRadius: "24px 24px 0 0", marginTop: -20 }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginBottom: 18, lineHeight: 1.5 }}>
          {p ? (lang === "en" ? p.name : p.nameBn) : "Your location"}{" "}
          <span style={{ color: "rgba(255,255,255,.18)" }}>→</span>{" "}
          <strong style={{ color: "#f0eeec", fontWeight: 900 }}>Arsalan {a?.shortName}</strong>
        </div>
        <div
          className="grid grid-cols-3 rounded-[14px] overflow-hidden mb-5"
          style={{ gap: 1, background: "rgba(255,255,255,.06)" }}
        >
          <Stat label={txt.distance} value={km} unit="km" />
          <Stat label={txt.drive} value={String(min)} unit={txt.min} />
          <Stat label={txt.tableWait} value={String(wait)} unit={txt.min} gold />
        </div>
        <button
          onClick={openMaps}
          className="w-full rounded-[14px] border-0 mb-2.5"
          style={{ minHeight: 54, background: "#E9C15B", fontSize: 15, fontWeight: 900, color: "#111" }}
        >
          {txt.openMaps}
        </button>
        <button
          onClick={back}
          className="w-full rounded-[14px] border"
          style={{ minHeight: 44, background: "transparent", borderColor: "rgba(255,255,255,.1)", borderWidth: 1.5, fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.4)" }}
        >
          {txt.cancel}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, unit, gold }: { label: string; value: string; unit: string; gold?: boolean }) {
  return (
    <div style={{ background: "#191919", padding: "14px 12px" }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.3)" }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: gold ? "#E9C15B" : "#f0eeec", marginTop: 5 }}>
        {value}
        <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}> {unit}</span>
      </div>
    </div>
  );
}
