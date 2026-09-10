"use client";
import { useEffect, useState, useCallback } from "react";
import { sb, hasSupabase } from "@/lib/supabase";
import { PANDALS, ARSALANS, ZONES } from "@/lib/seed";
import type { Pandal, Arsalan, Zone, ZoneId } from "@/lib/types";

const ADMIN_PW_DEFAULT = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "pujo2025";
const PW_KEY = "pujoAdminPw";
const API_KEY = "pujoApiKey";

type Tab = { kind: "zone"; id: string } | { kind: "settings" } | { kind: "stats" };
type EditKind = "arsalan" | "pandal" | null;

// Same Places API call the edit-modal uses, factored out for bulk fetch.
async function placesFetch(apiKey: string, textQuery: string) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.currentOpeningHours,places.regularOpeningHours,places.location,places.photos,places.googleMapsUri",
    },
    body: JSON.stringify({ textQuery: `${textQuery} Kolkata` }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  const p = d.places?.[0];
  if (!p) throw new Error("No results");
  const photo = p.photos?.[0];
  return {
    placeName: p.displayName?.text as string | undefined,
    rating: p.rating as number | undefined,
    lat: p.location?.latitude as number | undefined,
    lng: p.location?.longitude as number | undefined,
    mapsLink: p.googleMapsUri as string | undefined,
    photoUrl: photo ? `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=400&key=${apiKey}` : undefined,
    openHours: p.regularOpeningHours?.weekdayDescriptions?.[0]?.split(": ")[1] as string | undefined,
    address: p.formattedAddress as string | undefined,
  };
}

const isFetched = (x: { mapsLink?: string; lat?: number; lng?: number }) =>
  !!(x.mapsLink && x.lat && x.lng);

export default function AdminPage() {
  const [ok, setOk] = useState(false);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("pujoAdminOk") === "1") setOk(true);
  }, []);

  if (!ok) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const stored = localStorage.getItem(PW_KEY) || ADMIN_PW_DEFAULT;
            if (pw === stored) {
              sessionStorage.setItem("pujoAdminOk", "1");
              setOk(true);
            } else setPwErr("Incorrect password");
          }}
          style={{ background: "#191919", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: 40, width: 340 }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            Arsalan Near Me <span style={{ color: "#E9C15B" }}>Admin</span>
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginBottom: 28 }}>
            Manage zones, pandals & Arsalan outlets
          </p>
          <Field label="Password">
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoFocus
              placeholder="Enter password"
            />
          </Field>
          <div style={{ fontSize: 12, color: "#ff6b6b", marginTop: 8, minHeight: 18 }}>{pwErr}</div>
          <button type="submit" className="btn-gold" style={{ width: "100%", marginTop: 8 }}>Sign in</button>
          <p style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,.2)", textAlign: "center" }}>
            Default: {ADMIN_PW_DEFAULT}
          </p>
        </form>
        <AdminStyles />
      </div>
    );
  }

  return <AdminApp onLogout={() => { sessionStorage.removeItem("pujoAdminOk"); setOk(false); }} />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function AdminApp({ onLogout }: { onLogout: () => void }) {
  const [zones, setZones] = useState<Zone[]>(ZONES);
  const [arsalans, setArsalans] = useState<Arsalan[]>(ARSALANS);
  const [pandals, setPandals] = useState<Pandal[]>(PANDALS);
  const [tab, setTab] = useState<Tab>({ kind: "zone", id: ZONES[0].id });
  const [saved, setSaved] = useState(false);
  const [edit, setEdit] = useState<{ kind: EditKind; zoneId: string; itemId: string | null }>({ kind: null, zoneId: "", itemId: null });

  const reload = useCallback(async () => {
    const c = sb();
    if (!c) return;
    const [z, a, p] = await Promise.all([
      c.from("zones").select("*"),
      c.from("arsalans").select("*"),
      c.from("pandals").select("*"),
    ]);
    if (z.data?.length) setZones(z.data.map((r) => ({ id: r.id, name: r.name, nameBn: r.name_bn, color: r.color })));
    if (a.data?.length) setArsalans(a.data.map(mapArs));
    if (p.data?.length) setPandals(p.data.map(mapPandal));
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    if (tab.kind === "zone" && !zones.find((z) => z.id === tab.id)) {
      if (zones.length) setTab({ kind: "zone", id: zones[0].id });
    }
  }, [zones, tab]);

  const flashSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 1500); };

  async function upsertZone(z: Zone) {
    const c = sb();
    if (c) await c.from("zones").upsert({ id: z.id, name: z.name, name_bn: z.nameBn, color: z.color });
    flashSaved();
  }
  async function upsertArsalan(a: Arsalan) {
    const c = sb();
    if (c) await c.from("arsalans").upsert({
      id: a.id, zone_id: a.zoneId, name: a.name, short_name: a.shortName,
      place_name: a.placeName, maps_link: a.mapsLink, rating: a.rating,
      lat: a.lat, lng: a.lng, open_hours: a.openHours, wait_min: a.waitMin, photo_url: a.photoUrl,
    });
    flashSaved();
  }
  async function upsertPandal(p: Pandal) {
    const c = sb();
    if (c) await c.from("pandals").upsert({
      id: p.id, zone_id: p.zoneId, name: p.name, name_bn: p.nameBn,
      place_name: p.placeName, maps_link: p.mapsLink, rating: p.rating, photo_url: p.photoUrl,
      lat: p.lat, lng: p.lng, theme: p.theme, theme_bn: p.themeBn,
      queue_min: p.queueMin, crowd: p.crowd, arsalan_id: p.arsalanId,
    });
    flashSaved();
  }

  async function deleteZone(id: string) {
    if (!confirm("Delete this zone and all its data?")) return;
    const c = sb();
    if (c) await c.from("zones").delete().eq("id", id);
    setZones((prev) => prev.filter((z) => z.id !== id));
    setArsalans((prev) => prev.filter((a) => a.zoneId !== id));
    setPandals((prev) => prev.filter((p) => p.zoneId !== id));
  }
  async function deleteArsalan(id: string) {
    if (!confirm("Delete this outlet?")) return;
    const c = sb();
    if (c) await c.from("arsalans").delete().eq("id", id);
    setArsalans((prev) => prev.filter((a) => a.id !== id));
  }
  async function deletePandal(id: string) {
    if (!confirm("Delete this pandal?")) return;
    const c = sb();
    if (c) await c.from("pandals").delete().eq("id", id);
    setPandals((prev) => prev.filter((p) => p.id !== id));
  }

  function addZone() {
    const name = prompt("Zone name (e.g. Central Kolkata):");
    if (!name) return;
    const id = `zone_${Date.now()}`;
    const z: Zone = { id: id as ZoneId, name, nameBn: "", color: "#E9C15B" };
    setZones((prev) => [...prev, z]);
    upsertZone(z);
    setTab({ kind: "zone", id });
  }

  async function seedAll() {
    const c = sb();
    if (!c) { alert("Add Supabase env vars first"); return; }
    await c.from("zones").upsert(ZONES.map((z) => ({ id: z.id, name: z.name, name_bn: z.nameBn, color: z.color })));
    await c.from("arsalans").upsert(ARSALANS.map((a) => ({
      id: a.id, zone_id: a.zoneId, name: a.name, short_name: a.shortName,
      place_name: a.placeName, maps_link: a.mapsLink, rating: a.rating,
      lat: a.lat, lng: a.lng, open_hours: a.openHours, wait_min: a.waitMin, photo_url: a.photoUrl,
    })));
    await c.from("pandals").upsert(PANDALS.map((p) => ({
      id: p.id, zone_id: p.zoneId, name: p.name, name_bn: p.nameBn,
      place_name: p.placeName, maps_link: p.mapsLink, rating: p.rating, photo_url: p.photoUrl,
      lat: p.lat, lng: p.lng, theme: p.theme, theme_bn: p.themeBn,
      queue_min: p.queueMin, crowd: p.crowd, arsalan_id: p.arsalanId,
    })));
    alert(`Seeded ${ZONES.length} zones, ${ARSALANS.length} outlets, ${PANDALS.length} pandals.`);
    reload();
  }

  function exportJson() {
    const payload = { zones, arsalans, pandals };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pujo-data.json";
    a.click();
  }

  const zone = tab.kind === "zone" ? zones.find((z) => z.id === tab.id) : null;
  const zoneArsalans = zone ? arsalans.filter((a) => a.zoneId === zone.id) : [];
  const zonePandals = zone ? pandals.filter((p) => p.zoneId === zone.id) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#0d0d0d", color: "#f0eeec", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <header style={{ background: "#111", borderBottom: "1px solid rgba(255,255,255,.07)", padding: "0 28px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <h1 style={{ fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          🕯️ Arsalan Near Me <span style={{ color: "#E9C15B" }}>Admin</span>
          <span style={{ marginLeft: 12, fontSize: 11, fontWeight: 600, color: hasSupabase() ? "#4caf50" : "#ff6b6b" }}>
            {hasSupabase() ? "● Supabase" : "○ No Supabase env"}
          </span>
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {saved && <span style={{ fontSize: 12, color: "#4caf50", fontWeight: 600 }}>✓ Saved</span>}
          <button className="btn-ghost" onClick={() => {
            const np = prompt("New password (min 6 chars):");
            if (np && np.length >= 6) { localStorage.setItem(PW_KEY, np); alert("Password updated."); }
            else if (np) alert("Too short.");
          }}>Change password</button>
          <button className="btn-ghost" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <nav style={{ width: 220, flex: "none", background: "#111", borderRight: "1px solid rgba(255,255,255,.07)", padding: "20px 12px 80px", display: "flex", flexDirection: "column", gap: 4, position: "sticky", top: 58, height: "calc(100vh - 58px)", overflowY: "auto" }}>
          <div className="sidebar-label">Zones</div>
          {zones.map((z) => {
            const active = tab.kind === "zone" && tab.id === z.id;
            return (
              <button
                key={z.id}
                onClick={() => setTab({ kind: "zone", id: z.id })}
                className={`zone-tab ${active ? "active" : ""}`}
              >
                <span className="zone-dot" style={{ background: z.color || "#E9C15B" }} />
                {z.name}
              </button>
            );
          })}
          <button className="add-zone-btn" onClick={addZone}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Add zone
          </button>
          <div className="sidebar-label" style={{ marginTop: "auto" }}>Insights</div>
          <button className={`zone-tab ${tab.kind === "stats" ? "active" : ""}`} onClick={() => setTab({ kind: "stats" })}>📊 Live stats</button>
          <div className="sidebar-label">Settings</div>
          <button className={`zone-tab ${tab.kind === "settings" ? "active" : ""}`} onClick={() => setTab({ kind: "settings" })}>⚙ Settings</button>
        </nav>

        <div style={{ flex: 1, padding: "28px 32px 100px", overflowY: "auto" }}>
          {tab.kind === "zone" && zone && (
            <ZoneEditor
              zone={zone}
              arsalans={zoneArsalans}
              pandals={zonePandals}
              onZoneChange={(patch) => {
                const updated = { ...zone, ...patch };
                setZones((prev) => prev.map((z) => (z.id === zone.id ? updated : z)));
                upsertZone(updated);
              }}
              onDeleteZone={() => deleteZone(zone.id)}
              onAddArsalan={() => setEdit({ kind: "arsalan", zoneId: zone.id, itemId: null })}
              onEditArsalan={(id) => setEdit({ kind: "arsalan", zoneId: zone.id, itemId: id })}
              onDeleteArsalan={deleteArsalan}
              onAddPandal={() => setEdit({ kind: "pandal", zoneId: zone.id, itemId: null })}
              onEditPandal={(id) => setEdit({ kind: "pandal", zoneId: zone.id, itemId: id })}
              onDeletePandal={deletePandal}
              onBulkSaveArsalan={async (a) => {
                setArsalans((prev) => prev.map((x) => (x.id === a.id ? a : x)));
                await upsertArsalan(a);
              }}
              onBulkSavePandal={async (p) => {
                setPandals((prev) => prev.map((x) => (x.id === p.id ? p : x)));
                await upsertPandal(p);
              }}
            />
          )}
          {tab.kind === "stats" && <StatsPanel />}
          {tab.kind === "settings" && <SettingsPanel onSeed={seedAll} onExport={exportJson} />}
        </div>
      </div>

      {edit.kind && (
        <EditModal
          kind={edit.kind}
          zoneId={edit.zoneId}
          itemId={edit.itemId}
          arsalans={arsalans.filter((a) => a.zoneId === edit.zoneId)}
          allArsalans={arsalans}
          pandals={pandals}
          onClose={() => setEdit({ kind: null, zoneId: "", itemId: null })}
          onSaveArsalan={(a) => {
            setArsalans((prev) => {
              const i = prev.findIndex((x) => x.id === a.id);
              if (i >= 0) { const copy = [...prev]; copy[i] = a; return copy; }
              return [...prev, a];
            });
            upsertArsalan(a);
            setEdit({ kind: null, zoneId: "", itemId: null });
          }}
          onSavePandal={(p) => {
            setPandals((prev) => {
              const i = prev.findIndex((x) => x.id === p.id);
              if (i >= 0) { const copy = [...prev]; copy[i] = p; return copy; }
              return [...prev, p];
            });
            upsertPandal(p);
            setEdit({ kind: null, zoneId: "", itemId: null });
          }}
        />
      )}

      <AdminStyles />
    </div>
  );
}

function ZoneEditor({
  zone, arsalans, pandals, onZoneChange, onDeleteZone,
  onAddArsalan, onEditArsalan, onDeleteArsalan,
  onAddPandal, onEditPandal, onDeletePandal,
  onBulkSaveArsalan, onBulkSavePandal,
}: {
  zone: Zone; arsalans: Arsalan[]; pandals: Pandal[];
  onZoneChange: (patch: Partial<Zone>) => void;
  onDeleteZone: () => void;
  onAddArsalan: () => void;
  onEditArsalan: (id: string) => void;
  onDeleteArsalan: (id: string) => void;
  onAddPandal: () => void;
  onEditPandal: (id: string) => void;
  onDeletePandal: (id: string) => void;
  onBulkSaveArsalan: (a: Arsalan) => Promise<void>;
  onBulkSavePandal: (p: Pandal) => Promise<void>;
}) {
  const [bulk, setBulk] = useState<{ running: boolean; done: number; total: number; last?: string; errors: string[] }>({ running: false, done: 0, total: 0, errors: [] });
  const apiKey = typeof window !== "undefined" ? localStorage.getItem(API_KEY) || "" : "";
  const missingArs = arsalans.filter((a) => !isFetched(a));
  const missingPan = pandals.filter((p) => !isFetched(p));
  const missingCount = missingArs.length + missingPan.length;

  async function bulkFetch() {
    if (!apiKey) { alert("Add a Google Places API key in Settings first."); return; }
    if (missingCount === 0) { alert("Everything in this zone is already fetched."); return; }
    setBulk({ running: true, done: 0, total: missingCount, errors: [] });
    let done = 0;
    const errors: string[] = [];
    for (const a of missingArs) {
      try {
        const q = a.placeName || a.name;
        const r = await placesFetch(apiKey, q);
        const updated: Arsalan = {
          ...a,
          placeName: r.placeName || a.placeName || q,
          rating: r.rating ?? a.rating,
          lat: r.lat ?? a.lat,
          lng: r.lng ?? a.lng,
          mapsLink: r.mapsLink || a.mapsLink,
          photoUrl: r.photoUrl || a.photoUrl,
          openHours: r.openHours || a.openHours,
        };
        await onBulkSaveArsalan(updated);
        done++;
        setBulk((b) => ({ ...b, done, last: `✓ ${a.name}`, errors }));
      } catch (e: any) {
        errors.push(`${a.name}: ${e.message}`);
        setBulk((b) => ({ ...b, done: ++done, last: `✕ ${a.name}`, errors }));
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    for (const p of missingPan) {
      try {
        const q = p.placeName || p.name;
        const r = await placesFetch(apiKey, q);
        const updated: Pandal = {
          ...p,
          placeName: r.placeName || p.placeName || q,
          rating: r.rating ?? p.rating,
          lat: r.lat ?? p.lat,
          lng: r.lng ?? p.lng,
          mapsLink: r.mapsLink || p.mapsLink,
          photoUrl: r.photoUrl || p.photoUrl,
        };
        await onBulkSavePandal(updated);
        done++;
        setBulk((b) => ({ ...b, done, last: `✓ ${p.name}`, errors }));
      } catch (e: any) {
        errors.push(`${p.name}: ${e.message}`);
        setBulk((b) => ({ ...b, done: ++done, last: `✕ ${p.name}`, errors }));
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    setBulk((b) => ({ ...b, running: false }));
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="section-header">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{zone.name}</h2>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 2 }}>
            Manage Arsalan outlets and pandals for this zone
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-fetch"
            onClick={bulkFetch}
            disabled={bulk.running || missingCount === 0}
            style={{ opacity: bulk.running || missingCount === 0 ? 0.55 : 1 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#4285f4" strokeWidth="1.8" />
              <path d="M16.5 16.5L21 21" stroke="#4285f4" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            {bulk.running
              ? `Fetching… ${bulk.done}/${bulk.total}`
              : missingCount === 0
                ? "All fetched"
                : `Fetch ${missingCount} missing from Google`}
          </button>
          <button className="btn-danger" onClick={onDeleteZone}>Delete zone</button>
        </div>
      </div>
      {(bulk.running || bulk.done > 0) && (
        <div className="card" style={{ padding: 12, marginBottom: 16 }}>
          <div style={{ height: 4, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: 4, background: "#E9C15B", width: `${bulk.total ? (bulk.done / bulk.total) * 100 : 0}%`, transition: "width .3s" }} />
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 8 }}>
            {bulk.last} · {bulk.done}/{bulk.total} done
          </div>
          {bulk.errors.length > 0 && (
            <details style={{ marginTop: 6 }}>
              <summary style={{ fontSize: 11, color: "#ff6b6b", cursor: "pointer" }}>{bulk.errors.length} error(s)</summary>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 6, whiteSpace: "pre-wrap" }}>
                {bulk.errors.join("\n")}
              </div>
            </details>
          )}
        </div>
      )}

      <div className="zone-name-row">
        <div className="field" style={{ flex: 1, margin: 0 }}>
          <label>Zone name (English)</label>
          <input value={zone.name} onChange={(e) => onZoneChange({ name: e.target.value })} />
        </div>
        <div className="field" style={{ flex: 1, margin: 0 }}>
          <label>Zone name (Bengali)</label>
          <input value={zone.nameBn || ""} onChange={(e) => onZoneChange({ nameBn: e.target.value })} />
        </div>
        <div className="field" style={{ flex: "0 0 120px", margin: 0 }}>
          <label>Accent colour</label>
          <input type="color" value={zone.color || "#E9C15B"} onChange={(e) => onZoneChange({ color: e.target.value })} style={{ height: 44, padding: "4px 8px" }} />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>🍲 Arsalan Outlets</h3>
          <button className="btn-sm" onClick={onAddArsalan}>+ Add outlet</button>
        </div>
        {arsalans.length ? arsalans.map((a) => (
          <div key={a.id} className="item-row">
            <div className="item-info">
              <div className="item-name">{a.name}</div>
              <div className="item-sub" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                <span className="plus-badge">{a.placeName || "No place name set"}</span>
                <span>{a.openHours}</span>
                {a.waitMin ? <span>~{a.waitMin} min wait</span> : null}
              </div>
            </div>
            <div className="item-actions">
              <button className="btn-ghost" onClick={() => testMaps(a.mapsLink, a.placeName)}>Test in Maps</button>
              <button className="btn-sm" onClick={() => onEditArsalan(a.id)}>Edit</button>
              <button className="btn-danger" onClick={() => onDeleteArsalan(a.id)}>✕</button>
            </div>
          </div>
        )) : <div className="empty-row">No outlets yet — add one above</div>}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>🏮 Pandals ({pandals.length})</h3>
          <button className="btn-sm" onClick={onAddPandal}>+ Add pandal</button>
        </div>
        {pandals.length ? pandals.map((p, i) => (
          <div key={p.id} className="item-row">
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(233,193,91,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#E9C15B", flexShrink: 0 }}>
              {i + 1}
            </div>
            <div className="item-info">
              <div className="item-name">
                {p.name}{" "}
                <span style={{ color: "rgba(255,255,255,.35)", fontWeight: 400, fontSize: 12 }}>/ {p.nameBn}</span>
              </div>
              <div className="item-sub" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                <span className="plus-badge">{p.placeName || "No place name set"}</span>
                <span>{p.theme}</span>
                <span>Crowd: {"●".repeat(p.crowd)}{"○".repeat(5 - p.crowd)}</span>
              </div>
            </div>
            <div className="item-actions">
              <button className="btn-ghost" onClick={() => testMaps(p.mapsLink, p.placeName)}>Test in Maps</button>
              <button className="btn-sm" onClick={() => onEditPandal(p.id)}>Edit</button>
              <button className="btn-danger" onClick={() => onDeletePandal(p.id)}>✕</button>
            </div>
          </div>
        )) : <div className="empty-row">No pandals yet — add one above</div>}
      </div>
    </div>
  );
}

function testMaps(link: string, placeName: string) {
  if (link) window.open(link, "_blank");
  else if (placeName) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`, "_blank");
  else alert("No Maps link or place name set");
}

function EditModal({
  kind, zoneId, itemId, arsalans, allArsalans, pandals,
  onClose, onSaveArsalan, onSavePandal,
}: {
  kind: EditKind; zoneId: string; itemId: string | null;
  arsalans: Arsalan[]; allArsalans: Arsalan[]; pandals: Pandal[];
  onClose: () => void;
  onSaveArsalan: (a: Arsalan) => void;
  onSavePandal: (p: Pandal) => void;
}) {
  const existingArs = kind === "arsalan" && itemId ? allArsalans.find((x) => x.id === itemId) : null;
  const existingPan = kind === "pandal" && itemId ? pandals.find((x) => x.id === itemId) : null;

  const [f, setF] = useState<any>(() => {
    if (kind === "arsalan") {
      return existingArs || {
        id: `a_${Date.now()}`, zoneId, name: "", shortName: "", placeName: "", mapsLink: "",
        rating: 4.3, openHours: "11 AM – 2 AM", lat: 0, lng: 0, waitMin: 20, photoUrl: "",
      };
    }
    return existingPan || {
      id: `p_${Date.now()}`, zoneId, name: "", nameBn: "", placeName: "", mapsLink: "",
      rating: 4.5, photoUrl: "", lat: 0, lng: 0, theme: "", themeBn: "",
      queueMin: 20, crowd: 3, arsalanId: arsalans[0]?.id || "",
    };
  });
  const [fetchStatus, setFetchStatus] = useState<{ msg: string; ok?: boolean } | null>(null);

  const apiKey = typeof window !== "undefined" ? localStorage.getItem(API_KEY) || "" : "";

  async function fetchFromGoogle() {
    if (!apiKey) { alert("Add a Google Places API key in Settings first."); return; }
    const q = (f.placeName || f.name || "").trim();
    if (!q) { alert("Enter a place name first."); return; }
    setFetchStatus({ msg: "Searching…" });
    try {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.rating,places.currentOpeningHours,places.regularOpeningHours,places.location,places.photos,places.googleMapsUri",
        },
        body: JSON.stringify({ textQuery: `${q} Kolkata` }),
      });
      const d = await res.json();
      if (d.error) { setFetchStatus({ msg: "Error: " + d.error.message }); return; }
      const p = d.places?.[0];
      if (!p) { setFetchStatus({ msg: "No results found" }); return; }
      const patch: any = {
        placeName: p.displayName?.text || q,
        rating: p.rating || f.rating,
        lat: p.location?.latitude || f.lat,
        lng: p.location?.longitude || f.lng,
      };
      if (p.googleMapsUri) patch.mapsLink = p.googleMapsUri;
      const periods = p.regularOpeningHours?.weekdayDescriptions;
      if (periods?.length && kind === "arsalan") patch.openHours = periods[0].split(": ")[1] || f.openHours;
      const photo = p.photos?.[0];
      if (photo) patch.photoUrl = `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=400&key=${apiKey}`;
      setF({ ...f, ...patch });
      setFetchStatus({ msg: "✓ Filled — " + (p.formattedAddress || ""), ok: true });
    } catch (e: any) {
      setFetchStatus({ msg: "Fetch failed: " + e.message });
    }
  }

  function save() {
    if (kind === "arsalan") onSaveArsalan(f as Arsalan);
    else onSavePandal(f as Pandal);
  }

  const title = kind === "arsalan"
    ? (itemId ? "Edit Arsalan Outlet" : "Add Arsalan Outlet")
    : (itemId ? "Edit Pandal" : "Add Pandal");

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h2>{title}</h2>

        {kind === "arsalan" ? (
          <>
            <Field label="Full name">
              <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Arsalan Restaurant & Caterer - Park Circus" />
            </Field>
            <Field label="Short name (shown in app)">
              <input value={f.shortName} onChange={(e) => setF({ ...f, shortName: e.target.value })} placeholder="Park Circus" />
            </Field>
          </>
        ) : (
          <>
            <Field label="Pandal name (English)">
              <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </Field>
            <Field label="Name in Bengali">
              <input value={f.nameBn} onChange={(e) => setF({ ...f, nameBn: e.target.value })} />
            </Field>
          </>
        )}

        <Field label="Place name (used for Google Maps pin)">
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <input
              value={f.placeName}
              onChange={(e) => setF({ ...f, placeName: e.target.value })}
              placeholder="e.g. Ekdalia Evergreen Club, Kolkata"
              style={{ flex: 1 }}
            />
            {apiKey ? (
              <button type="button" className="btn-fetch" onClick={fetchFromGoogle}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="#4285f4" strokeWidth="1.8" />
                  <path d="M16.5 16.5L21 21" stroke="#4285f4" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Fetch
              </button>
            ) : null}
          </div>
          {!apiKey && <div className="hint">Add a Google Places API key in Settings to auto-fill.</div>}
          {fetchStatus && (
            <div style={{ fontSize: 11, marginTop: 6, color: fetchStatus.ok ? "#4caf50" : "#ff6b6b" }}>
              {fetchStatus.msg}
            </div>
          )}
        </Field>

        <Field label="Google Maps share link (verified pin)">
          <input value={f.mapsLink} onChange={(e) => setF({ ...f, mapsLink: e.target.value })} placeholder="https://maps.app.goo.gl/..." />
          <div className="hint">If set, "Test in Maps" and Route CTAs open this exact link.</div>
        </Field>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Latitude">
            <input type="number" step="0.0001" value={f.lat} onChange={(e) => setF({ ...f, lat: parseFloat(e.target.value) || 0 })} />
          </Field>
          <Field label="Longitude">
            <input type="number" step="0.0001" value={f.lng} onChange={(e) => setF({ ...f, lng: parseFloat(e.target.value) || 0 })} />
          </Field>
        </div>

        {kind === "arsalan" ? (
          <>
            <div style={{ display: "flex", gap: 12 }}>
              <Field label="Rating">
                <input value={f.rating || ""} onChange={(e) => setF({ ...f, rating: parseFloat(e.target.value) || 0 })} placeholder="4.2" />
              </Field>
              <Field label="Avg wait (min)">
                <input type="number" value={f.waitMin} onChange={(e) => setF({ ...f, waitMin: parseInt(e.target.value) || 0 })} />
              </Field>
            </div>
            <Field label="Open hours">
              <input value={f.openHours} onChange={(e) => setF({ ...f, openHours: e.target.value })} />
            </Field>
            <Field label="Photo URL">
              <input value={f.photoUrl || ""} onChange={(e) => setF({ ...f, photoUrl: e.target.value })} placeholder="auto-filled or paste one" />
            </Field>
          </>
        ) : (
          <>
            <div style={{ display: "flex", gap: 12 }}>
              <Field label="Theme">
                <input value={f.theme} onChange={(e) => setF({ ...f, theme: e.target.value })} />
              </Field>
              <Field label="Queue (min)">
                <input type="number" value={f.queueMin} onChange={(e) => setF({ ...f, queueMin: parseInt(e.target.value) || 0 })} />
              </Field>
            </div>
            <Field label="Crowd level">
              <div className="crowd-row">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`crowd-btn ${f.crowd === n ? "active" : ""}`}
                    onClick={() => setF({ ...f, crowd: n })}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Nearest Arsalan outlet">
              <select value={f.arsalanId} onChange={(e) => setF({ ...f, arsalanId: e.target.value })}>
                {arsalans.length === 0 && <option value="">— add an outlet in this zone first —</option>}
                {arsalans.map((a) => (
                  <option key={a.id} value={a.id}>{a.shortName || a.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Photo URL">
              <input value={f.photoUrl || ""} onChange={(e) => setF({ ...f, photoUrl: e.target.value })} placeholder="auto-filled or paste one" />
            </Field>
          </>
        )}

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-gold" style={{ width: "auto", padding: "11px 24px", margin: 0, fontSize: 14 }} onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}

function StatsPanel() {
  const [total, setTotal] = useState(0);
  const [today, setToday] = useState(0);
  const [live, setLive] = useState(0);
  const [rows, setRows] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    const c = sb();
    if (!c) return;
    const now = Date.now();
    const dayAgo = new Date(now - 86400000).toISOString();
    const fiveMinAgo = new Date(now - 5 * 60000).toISOString();
    const [t, d, l, recent] = await Promise.all([
      c.from("sessions").select("*", { count: "exact", head: true }),
      c.from("sessions").select("*", { count: "exact", head: true }).gte("last_seen", dayAgo),
      c.from("sessions").select("*", { count: "exact", head: true }).gte("last_seen", fiveMinAgo),
      c.from("sessions").select("ip,ua,hits,last_seen").order("last_seen", { ascending: false }).limit(50),
    ]);
    setTotal(t.count ?? 0); setToday(d.count ?? 0); setLive(l.count ?? 0); setRows(recent.data ?? []);
  }, []);

  useEffect(() => {
    refresh();
    const c = sb();
    if (!c) return;
    const iv = setInterval(refresh, 15000);
    const ch = c.channel("admin-sessions").on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, refresh).subscribe();
    return () => { clearInterval(iv); c.removeChannel(ch); };
  }, [refresh]);

  if (!hasSupabase()) return <div className="card" style={{ padding: 20 }}>Add Supabase env vars to see stats.</div>;

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="section-header">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Live stats</h2>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 2 }}>Anonymous session counts, keyed by IP + user agent.</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        <Kpi label="Live now" value={live} sub="active in last 5 min" gold />
        <Kpi label="Today" value={today} sub="last 24 hours" />
        <Kpi label="All time" value={total} sub="unique visitors" />
      </div>
      <div className="card">
        <div className="card-header"><h3>Recent sessions</h3></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,.03)", textAlign: "left" }}>
                <th style={{ padding: 10 }}>Last seen</th>
                <th style={{ padding: 10 }}>IP</th>
                <th style={{ padding: 10 }}>Device</th>
                <th style={{ padding: 10 }}>Hits</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,.04)" }}>
                  <td style={{ padding: 10, color: "rgba(255,255,255,.7)" }}>{new Date(r.last_seen).toLocaleString()}</td>
                  <td style={{ padding: 10, fontFamily: "monospace" }}>{r.ip}</td>
                  <td style={{ padding: 10, color: "rgba(255,255,255,.5)", maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.ua}</td>
                  <td style={{ padding: 10 }}>{r.hits}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 20, color: "rgba(255,255,255,.4)" }}>No sessions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, gold }: { label: string; value: number; sub: string; gold?: boolean }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".13em", textTransform: "uppercase", color: gold ? "#E9C15B" : "rgba(255,255,255,.35)" }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 900, color: gold ? "#E9C15B" : "#f0eeec", marginTop: 6, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 6 }}>{sub}</div>
    </div>
  );
}

function SettingsPanel({ onSeed, onExport }: { onSeed: () => void; onExport: () => void }) {
  const [key, setKey] = useState("");
  useEffect(() => { if (typeof window !== "undefined") setKey(localStorage.getItem(API_KEY) || ""); }, []);
  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="section-header">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Settings</h2>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 2 }}>API keys and data tools</p>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><h3>Google Places API</h3></div>
        <div className="item-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)" }}>
            Add your API key to auto-fetch place names, ratings, coordinates and photos from Google Maps.
            Get one at <a href="https://console.cloud.google.com" target="_blank" style={{ color: "#4285f4" }}>console.cloud.google.com</a> → Enable "Places API (New)".
          </p>
          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIza..."
              style={{ flex: 1, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#f0eeec", outline: "none", fontFamily: "monospace" }}
            />
            <button className="btn-sm" onClick={() => { localStorage.setItem(API_KEY, key); alert("Saved!"); }}>Save key</button>
            <button className="btn-danger" onClick={() => { localStorage.removeItem(API_KEY); setKey(""); alert("Removed."); }}>Remove</button>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>
            The key stays in your browser's localStorage — it never leaves your device except in requests to Google.
          </p>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><h3>Data</h3></div>
        <div className="item-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)" }}>
            Load the built-in Kolkata seed into your Supabase project, or export what's there.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-sm" onClick={onSeed}>Seed database</button>
            <button className="btn-ghost" onClick={onExport}>Export JSON backup</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminStyles() {
  return (
    <style jsx global>{`
      .field { margin-bottom: 16px; }
      .field label { font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.35); display: block; margin-bottom: 6px; }
      .field input, .field select, .field textarea {
        width: 100%; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
        border-radius: 10px; padding: 11px 14px; font-size: 14px; color: #f0eeec; outline: none; transition: border .15s;
        font-family: inherit;
      }
      .field input:focus, .field select:focus, .field textarea:focus { border-color: #E9C15B; }
      .field select option { background: #1a1a1a; }

      .btn-gold { background: #E9C15B; color: #111; border: 0; border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity .15s; }
      .btn-gold:hover { opacity: .9; }
      .btn-ghost { background: rgba(255,255,255,.07); color: rgba(255,255,255,.7); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; padding: 8px 14px; font-size: 13px; font-weight: 600; transition: background .15s; cursor: pointer; }
      .btn-ghost:hover { background: rgba(255,255,255,.12); }
      .btn-sm { background: rgba(233,193,91,.15); color: #E9C15B; border: 1px solid rgba(233,193,91,.3); border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 700; transition: background .15s; cursor: pointer; }
      .btn-sm:hover { background: rgba(233,193,91,.25); }
      .btn-danger { background: rgba(255,80,80,.12); color: #ff6b6b; border: 1px solid rgba(255,80,80,.25); border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
      .btn-danger:hover { background: rgba(255,80,80,.22); }
      .btn-fetch { background: rgba(66,133,244,.15); color: #4285f4; border: 1px solid rgba(66,133,244,.3); border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 700; transition: background .15s; display: flex; align-items: center; gap: 6px; cursor: pointer; white-space: nowrap; }
      .btn-fetch:hover { background: rgba(66,133,244,.25); }

      .sidebar-label { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.25); padding: 12px 10px 6px; }
      .zone-tab { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 600; color: rgba(255,255,255,.55); border: 0; background: transparent; width: 100%; text-align: left; transition: background .12s; font-family: inherit; }
      .zone-tab:hover { background: rgba(255,255,255,.05); }
      .zone-tab.active { background: rgba(233,193,91,.12); color: #E9C15B; }
      .zone-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
      .add-zone-btn { display: flex; align-items: center; gap: 6px; padding: 9px 12px; border-radius: 10px; cursor: pointer; font-size: 12px; font-weight: 700; color: rgba(255,255,255,.35); border: 1px dashed rgba(255,255,255,.12); background: transparent; width: 100%; margin-top: 8px; transition: all .12s; }
      .add-zone-btn:hover { border-color: #E9C15B; color: #E9C15B; }

      .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
      .card { background: #191919; border: 1px solid rgba(255,255,255,.07); border-radius: 14px; overflow: hidden; margin-bottom: 24px; }
      .card-header { padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,.06); display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,.02); }
      .card-header h3 { font-size: 13px; font-weight: 700; color: #E9C15B; letter-spacing: .06em; text-transform: uppercase; margin: 0; }
      .item-row { display: flex; align-items: center; gap: 12px; padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,.04); }
      .item-row:last-child { border-bottom: 0; }
      .item-info { flex: 1; min-width: 0; }
      .item-name { font-size: 14px; font-weight: 700; color: #f0eeec; }
      .item-sub { font-size: 11.5px; color: rgba(255,255,255,.38); margin-top: 2px; }
      .plus-badge { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 6px; padding: 2px 8px; font-size: 10.5px; font-weight: 600; color: rgba(255,255,255,.5); font-family: monospace; }
      .item-actions { display: flex; gap: 6px; flex-shrink: 0; }
      .empty-row { padding: 20px 18px; font-size: 13px; color: rgba(255,255,255,.25); text-align: center; }
      .zone-name-row { display: flex; gap: 12px; margin-bottom: 24px; background: #191919; border: 1px solid rgba(255,255,255,.07); border-radius: 14px; padding: 18px; }

      .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
      .modal { background: #1a1a1a; border: 1px solid rgba(255,255,255,.1); border-radius: 18px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; padding: 28px; }
      .modal h2 { font-size: 18px; font-weight: 800; margin-bottom: 20px; margin-top: 0; }
      .modal-footer { display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; }
      .crowd-row { display: flex; gap: 6px; }
      .crowd-btn { width: 36px; height: 36px; border-radius: 8px; border: 1.5px solid rgba(255,255,255,.12); background: transparent; color: rgba(255,255,255,.4); font-size: 13px; font-weight: 700; transition: all .12s; cursor: pointer; font-family: inherit; }
      .crowd-btn.active { border-color: #E9C15B; background: rgba(233,193,91,.15); color: #E9C15B; }
      .hint { font-size: 11px; color: rgba(255,255,255,.3); margin-top: 5px; }
    `}</style>
  );
}

function mapPandal(p: any): Pandal {
  return {
    id: p.id, zoneId: p.zone_id as ZoneId, name: p.name, nameBn: p.name_bn,
    placeName: p.place_name, mapsLink: p.maps_link || "", rating: p.rating || 4.5,
    photoUrl: p.photo_url, lat: p.lat, lng: p.lng, theme: p.theme || "",
    themeBn: p.theme_bn, queueMin: p.queue_min || 20, crowd: (p.crowd || 3) as Pandal["crowd"],
    arsalanId: p.arsalan_id,
  };
}
function mapArs(a: any): Arsalan {
  return {
    id: a.id, zoneId: a.zone_id as ZoneId, name: a.name, shortName: a.short_name,
    placeName: a.place_name, mapsLink: a.maps_link || "", rating: a.rating || 4.3,
    lat: a.lat, lng: a.lng, openHours: a.open_hours || "11 AM – 2 AM",
    waitMin: a.wait_min || 20, photoUrl: a.photo_url,
  };
}
