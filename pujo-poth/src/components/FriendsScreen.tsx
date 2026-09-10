"use client";
import { useState } from "react";
import { useApp, timeAgo } from "@/lib/store";
import { t } from "@/lib/i18n";
import { IconBack } from "./icons";
import CrewCodeBlock from "./CrewCodeBlock";

const COLORS = [
  "#E9C15B", "#f5837c", "#4285f4", "#4caf50",
  "#c471ed", "#f0b53a", "#ff6b9d", "#00d4b5",
  "#ff8c42", "#a78bfa", "#22d3ee", "#84cc16",
  "#f43f5e", "#3b82f6", "#10b981", "#eab308",
];

export default function FriendsScreen() {
  const { lang, back, identity, saveIdentity, share, setShare, friends, editingIdentity, setEditingIdentity, removeMyDot, resetIdentity } = useApp();
  const txt = t(lang);
  const [name, setName] = useState(identity?.name || "");
  const [color, setColor] = useState(identity?.color || COLORS[0]);

  const needsSetup = !identity || editingIdentity;

  return (
    <div className="absolute inset-0 z-20 flex flex-col anim-fade" style={{ background: "#111" }}>
      <div className="flex-none px-5" style={{ paddingTop: 66 }}>
        <div className="flex items-center gap-2.5 mb-1.5">
          <button
            onClick={back}
            className="w-9 h-9 rounded-[11px] border-0 flex items-center justify-center"
            style={{ background: "rgba(255,255,255,.07)" }}
          >
            <IconBack />
          </button>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#f0eeec" }}>{txt.groupTitle}</h2>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 20, paddingLeft: 46 }}>{txt.groupSub}</div>
      </div>

      {needsSetup ? (
        <div className="flex-1 overflow-y-auto px-5 pb-24">
          <div
            className="rounded-[18px] border mb-4"
            style={{ background: "rgba(233,193,91,.07)", borderColor: "rgba(233,193,91,.2)", padding: "22px 20px" }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f0eeec", marginBottom: 4 }}>Your dot</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 18 }}>
              Pick a name and colour. Friends see this on the map.
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.35)", marginBottom: 8 }}>
              Your name
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={10}
              placeholder="e.g. Rimi"
              className="w-full rounded-[12px] border outline-none mb-4"
              style={{
                background: "rgba(255,255,255,.07)", borderColor: "rgba(255,255,255,.12)",
                padding: "12px 14px", fontSize: 16, fontWeight: 700, color: "#f0eeec",
              }}
            />
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.35)", marginBottom: 10 }}>
              Your colour
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: 32, height: 32, background: c,
                    border: `3px solid ${color === c ? "#fff" : "transparent"}`,
                    transition: "border .12s",
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => name.trim() && saveIdentity(name.trim(), color)}
              className="w-full rounded-[12px] border-0 gold-shimmer"
              style={{ minHeight: 48, fontSize: 15, fontWeight: 700, color: "#111" }}
            >
              Save →
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-none px-5 pb-3">
            <div
              className="flex items-center gap-3 rounded-2xl border"
              style={{ background: "rgba(255,255,255,.05)", borderColor: "rgba(255,255,255,.07)", padding: "14px 16px" }}
            >
              <div
                className="w-[38px] h-[38px] rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: identity!.color, fontSize: 13, fontWeight: 800, color: "#111" }}
              >
                {identity!.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f0eeec" }}>{txt.shareDot}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{txt.shareSub}</div>
              </div>
              <button
                onClick={() => setShare(!share)}
                className="relative flex-shrink-0"
                style={{
                  width: 46, height: 28, border: 0, padding: 0, borderRadius: 14,
                  background: share ? "#E9C15B" : "rgba(255,255,255,.15)",
                  transition: "background .2s", cursor: "pointer",
                }}
              >
                <div
                  style={{
                    position: "absolute", top: 4, left: share ? 22 : 4,
                    width: 20, height: 20, borderRadius: "50%", background: "#fff",
                    boxShadow: "0 2px 6px rgba(0,0,0,.35)", transition: "left .2s",
                  }}
                />
              </button>
            </div>
            <div className="flex items-center gap-4" style={{ marginTop: 8 }}>
              <button
                onClick={() => setEditingIdentity(true)}
                style={{ background: "transparent", border: 0, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.3)", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}
              >
                Change name or colour
              </button>
              <button
                onClick={() => confirm("Remove your dot from the map? Friends will stop seeing you until you turn share back on.") && removeMyDot()}
                style={{ background: "transparent", border: 0, fontSize: 12, fontWeight: 600, color: "#ff8a8a", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}
              >
                Remove my dot
              </button>
              <button
                onClick={() => confirm("Reset your identity? This deletes your name & colour from this device and Supabase.") && resetIdentity()}
                style={{ background: "transparent", border: 0, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.3)", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}
              >
                Reset identity
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-24">
            <CrewCodeBlock />
            {friends.length === 0 && (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)", padding: "12px 0" }}>
                No friends sharing yet. Share the crew code above and turn on their dot.
              </div>
            )}
            {friends.map((f) => (
              <div key={f.id} className="flex items-center gap-3 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <div
                  className="w-11 h-11 flex-none rounded-[14px] flex items-center justify-center relative"
                  style={{ background: `${f.color}22` }}
                >
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: f.color }} />
                </div>
                <div className="flex-1">
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#f0eeec" }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{f.at}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,.2)" }}>{timeAgo(f.updatedAt)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
