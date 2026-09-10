"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";

export default function CrewCodeBlock() {
  const { groupCode, createGroup, joinGroup, leaveGroup } = useApp();
  const [joinInput, setJoinInput] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    groupCode && typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}?join=${groupCode}`
      : "";

  const share = async () => {
    if (!groupCode) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my Pujo crew",
          text: `Join my Pujo crew — code ${groupCode}`,
          url: shareUrl,
        });
        return;
      } catch { /* fall through to copy */ }
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (groupCode) {
    return (
      <div
        className="rounded-2xl border p-4 mb-3"
        style={{ background: "rgba(233,193,91,.07)", borderColor: "rgba(233,193,91,.22)" }}
      >
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "#E9C15B", marginBottom: 6 }}>
          Your crew code
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#f0eeec", letterSpacing: ".22em", fontFamily: "monospace" }}>
          {groupCode}
        </div>
        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", marginTop: 6, lineHeight: 1.4 }}>
          Share this code — or the link — with friends. Everyone who enters it sees each other's dots on the map.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={share}
            style={{
              flex: 1, minHeight: 40, border: 0, borderRadius: 10,
              background: "#E9C15B", color: "#111", fontSize: 13, fontWeight: 800, cursor: "pointer",
            }}
          >
            {copied ? "✓ Link copied" : "Share invite"}
          </button>
          <button
            onClick={() => confirm("Leave the crew? Friends will stop seeing your dot.") && leaveGroup()}
            style={{
              minHeight: 40, padding: "0 14px", border: "1px solid rgba(255,80,80,.25)", borderRadius: 10,
              background: "rgba(255,80,80,.1)", color: "#ff6b6b", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            Leave
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-4 mb-3" style={{ background: "rgba(255,255,255,.04)", borderColor: "rgba(255,255,255,.08)" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#f0eeec", marginBottom: 4 }}>You're not in a crew yet</div>
      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", marginBottom: 12, lineHeight: 1.4 }}>
        Create a crew and share the 6-letter code with friends — only people with the code see each other's dots.
      </div>
      <button
        onClick={() => createGroup()}
        style={{ width: "100%", minHeight: 42, border: 0, borderRadius: 11, background: "#E9C15B", color: "#111", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
      >
        Create a crew
      </button>

      <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,.28)", margin: "10px 0" }}>or</div>

      {!showJoin ? (
        <button
          onClick={() => setShowJoin(true)}
          style={{ width: "100%", minHeight: 42, border: "1px solid rgba(255,255,255,.15)", borderRadius: 11, background: "transparent", color: "#f0eeec", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          Join with a code
        </button>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            autoFocus
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="XYZ123"
            style={{
              flex: 1, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 10, padding: "10px 14px", fontSize: 15, fontWeight: 700, color: "#f0eeec",
              outline: "none", letterSpacing: ".18em", textAlign: "center", fontFamily: "monospace",
            }}
          />
          <button
            onClick={() => { if (joinInput.trim()) joinGroup(joinInput); setShowJoin(false); setJoinInput(""); }}
            style={{ padding: "0 16px", minHeight: 42, border: 0, borderRadius: 10, background: "#E9C15B", color: "#111", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
          >
            Join
          </button>
        </div>
      )}
    </div>
  );
}
