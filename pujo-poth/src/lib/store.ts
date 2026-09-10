"use client";
import { create } from "zustand";
import type { Screen, ZoneId, Lang, Pandal, Arsalan, Zone, Identity, Friend } from "./types";
import { PANDALS as SEED_PANDALS, ARSALANS as SEED_ARS, ZONES as SEED_ZONES, DEFAULT_USER } from "./seed";
import { sb } from "./supabase";
import { haversineKm, driveMin } from "./helpers";

interface State {
  screen: Screen;
  prev: Screen;
  zone: ZoneId;
  lang: Lang;
  selPandalId: string | null;
  selArsalanId: string | null;
  q: string;
  share: boolean;
  startHour: number;
  startMin: number;
  durMin: number;
  identity: Identity | null;
  editingIdentity: boolean;
  isDesktop: boolean;
  closingSheet: null | "pandal" | "arsalan";
  user: { lat: number; lng: number };
  zones: Zone[];
  pandals: Pandal[];
  arsalans: Arsalan[];
  friends: Friend[];
  routeStops: { lat: number; lng: number; label?: string }[];
  routeMode: "driving" | "walking";
  recenterSignal: number;
  liveWaits: Record<string, number>;

  go: (screen: Screen) => void;
  back: () => void;
  setZone: (z: ZoneId) => void;
  toggleLang: () => void;
  setSelPandal: (id: string | null) => void;
  setSelArsalan: (id: string | null) => void;
  setQ: (q: string) => void;
  setShare: (v: boolean) => void;
  incStartH: (dir: number) => void;
  incMinTens: (dir: number) => void;
  incMinUnits: (dir: number) => void;
  setAP: (ap: "AM" | "PM") => void;
  incDur: (dir: number) => void;
  setRouteStops: (s: State["routeStops"]) => void;
  setRouteMode: (m: "driving" | "walking") => void;
  recenter: () => void;
  saveIdentity: (name: string, color: string) => Promise<void>;
  setEditingIdentity: (v: boolean) => void;
  setDesktop: (v: boolean) => void;
  closePandal: () => void;
  closeArsalan: () => void;
  loadData: () => Promise<void>;
  subscribeFriends: () => () => void;
  pushMyPosition: () => Promise<void>;
  subscribeWaits: () => () => void;
  reportChosenArsalan: (arsalanId: string) => Promise<void>;
}

const IDENTITY_KEY = "pujoPothIdentity";

function loadIdentity(): Identity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useApp = create<State>((set, get) => ({
  screen: "map",
  prev: "map",
  zone: "south",
  lang: "en",
  selPandalId: null,
  selArsalanId: null,
  q: "",
  share: false,
  startHour: 18,
  startMin: 30,
  durMin: 240,
  identity: loadIdentity(),
  editingIdentity: false,
  isDesktop: false,
  closingSheet: null,
  user: DEFAULT_USER,
  zones: SEED_ZONES,
  pandals: SEED_PANDALS,
  arsalans: SEED_ARS,
  friends: [],
  routeStops: [],
  routeMode: "driving",
  recenterSignal: 0,
  liveWaits: {},

  go: (screen) => set((s) => ({ prev: s.screen, screen, closingSheet: null })),
  back: () => set((s) => ({ screen: s.prev, prev: "map" })),
  setZone: (zone) => set({ zone }),
  toggleLang: () => {
    set((s) => {
      const lang: Lang = s.lang === "en" ? "bn" : "en";
      if (typeof document !== "undefined") {
        document.body.classList.toggle("lang-bn", lang === "bn");
      }
      return { lang };
    });
  },
  setSelPandal: (id) => set({ selPandalId: id }),
  setSelArsalan: (id) => set({ selArsalanId: id }),
  setQ: (q) => set({ q }),
  setShare: (v) => {
    set({ share: v });
    if (v) get().pushMyPosition();
    else {
      const id = get().identity?.id;
      const c = sb();
      if (id && c) c.from("presence").delete().eq("identity_id", id);
    }
  },
  incStartH: (dir) =>
    set((s) => ({ startHour: (s.startHour + dir + 24) % 24 })),
  incMinTens: (dir) =>
    set((s) => {
      const tens = Math.floor(s.startMin / 10);
      const units = s.startMin % 10;
      const newTens = (tens + dir + 6) % 6;
      return { startMin: newTens * 10 + units };
    }),
  incMinUnits: (dir) =>
    set((s) => {
      const tens = Math.floor(s.startMin / 10);
      const units = s.startMin % 10;
      const newUnits = (units + dir + 10) % 10;
      return { startMin: tens * 10 + newUnits };
    }),
  setAP: (ap) =>
    set((s) => ({
      startHour: ap === "AM" ? s.startHour % 12 : (s.startHour % 12) + 12,
    })),
  incDur: (dir) =>
    set((s) => ({ durMin: Math.max(30, Math.min(480, s.durMin + dir * 30)) })),
  setRouteStops: (routeStops) => set({ routeStops }),
  setRouteMode: (routeMode) => set({ routeMode }),
  recenter: () => set((s) => ({ recenterSignal: s.recenterSignal + 1 })),
  saveIdentity: async (name, color) => {
    const existing = get().identity;
    const id = existing?.id || crypto.randomUUID();
    const identity = { id, name, color };
    if (typeof window !== "undefined") {
      localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
    }
    set({ identity, editingIdentity: false });
    const c = sb();
    if (c) {
      await c.from("identities").upsert({ id, name, color });
    }
  },
  setEditingIdentity: (v) => set({ editingIdentity: v }),
  setDesktop: (v) => set({ isDesktop: v }),
  closePandal: () => {
    set({ closingSheet: "pandal" });
    setTimeout(() => set({ selPandalId: null, closingSheet: null, screen: "map" }), 240);
  },
  closeArsalan: () => {
    set({ closingSheet: "arsalan" });
    setTimeout(() => set({ selArsalanId: null, closingSheet: null, screen: "map" }), 240);
  },
  loadData: async () => {
    const c = sb();
    if (!c) return;
    const [zRes, aRes, pRes] = await Promise.all([
      c.from("zones").select("*"),
      c.from("arsalans").select("*"),
      c.from("pandals").select("*"),
    ]);
    const zones: Zone[] = zRes.data?.length
      ? zRes.data.map((z) => ({ id: z.id, name: z.name, nameBn: z.name_bn, color: z.color }))
      : get().zones;
    const arsalans: Arsalan[] = aRes.data?.length
      ? aRes.data.map((a) => ({
          id: a.id,
          zoneId: a.zone_id,
          name: a.name,
          shortName: a.short_name,
          placeName: a.place_name,
          mapsLink: a.maps_link || "",
          rating: a.rating || 4.3,
          lat: a.lat,
          lng: a.lng,
          openHours: a.open_hours || "11 AM – 2 AM",
          waitMin: a.wait_min || 20,
          photoUrl: a.photo_url,
        }))
      : get().arsalans;
    const pandals: Pandal[] = pRes.data?.length
      ? pRes.data.map((p) => ({
          id: p.id,
          zoneId: p.zone_id,
          name: p.name,
          nameBn: p.name_bn,
          placeName: p.place_name,
          mapsLink: p.maps_link || "",
          rating: p.rating || 4.5,
          photoUrl: p.photo_url,
          lat: p.lat,
          lng: p.lng,
          theme: p.theme || "",
          themeBn: p.theme_bn,
          queueMin: p.queue_min || 20,
          crowd: (p.crowd || 3) as Pandal["crowd"],
          arsalanId: p.arsalan_id,
        }))
      : get().pandals;
    set({ zones, arsalans, pandals });
  },
  subscribeFriends: () => {
    const c = sb();
    if (!c) return () => {};
    const load = async () => {
      const { data: pres } = await c.from("presence").select("*");
      if (!pres) return;
      const { data: idents } = await c.from("identities").select("*");
      const identsMap = new Map((idents || []).map((i) => [i.id, i]));
      const now = Date.now();
      const list: Friend[] = pres
        .map((p) => {
          const i = identsMap.get(p.identity_id);
          if (!i) return null;
          if (i.id === get().identity?.id) return null;
          const updatedAt = new Date(p.updated_at).getTime();
          return {
            id: i.id,
            name: i.name,
            color: i.color,
            lat: p.lat,
            lng: p.lng,
            at: p.at_label || "",
            updatedAt,
          } as Friend;
        })
        .filter((x): x is Friend => !!x && now - x.updatedAt < 1000 * 60 * 60 * 2);
      set({ friends: list });
    };
    load();
    const ch = c
      .channel("presence-friends")
      .on("postgres_changes", { event: "*", schema: "public", table: "presence" }, load)
      .subscribe();
    return () => {
      c.removeChannel(ch);
    };
  },
  subscribeWaits: () => {
    const c = sb();
    if (!c) return () => {};
    const load = async () => {
      // Get the latest wait per outlet
      const { data } = await c
        .from("arsalan_waits")
        .select("arsalan_id, wait_min, reported_at")
        .order("reported_at", { ascending: false })
        .limit(500);
      if (!data) return;
      const latest: Record<string, number> = {};
      for (const r of data) {
        if (r.arsalan_id != null && latest[r.arsalan_id] === undefined && r.wait_min != null) {
          latest[r.arsalan_id] = r.wait_min;
        }
      }
      set({ liveWaits: latest });
    };
    load();
    const ch = c
      .channel("arsalan-waits")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "arsalan_waits" }, load)
      .subscribe();
    return () => {
      c.removeChannel(ch);
    };
  },
  reportChosenArsalan: async (arsalanId) => {
    const c = sb();
    if (!c) return;
    // Nudge the reported wait up by 1 minute — soft signal that another person
    // is heading there. The realtime subscription broadcasts this to everyone
    // else, which biases their pickBestArsalan away from this outlet.
    const cur = get().liveWaits[arsalanId] ?? get().arsalans.find((a) => a.id === arsalanId)?.waitMin ?? 20;
    await c.from("arsalan_waits").insert({ arsalan_id: arsalanId, wait_min: cur + 1, people_count: 1 });
  },
  pushMyPosition: async () => {
    const c = sb();
    const id = get().identity?.id;
    if (!c || !id) return;
    const u = get().user;
    // Attach "at" label = nearest pandal/arsalan name
    const all = [
      ...get().pandals.map((p) => ({ name: p.name, lat: p.lat, lng: p.lng })),
      ...get().arsalans.map((a) => ({ name: `Arsalan ${a.shortName}`, lat: a.lat, lng: a.lng })),
    ];
    const nearest = all
      .map((x) => ({ ...x, d: haversineKm(u, x) }))
      .sort((a, b) => a.d - b.d)[0];
    const at_label = nearest && nearest.d < 0.6 ? `at ${nearest.name}` : "on the move";
    await c
      .from("presence")
      .upsert({ identity_id: id, lat: u.lat, lng: u.lng, at_label, updated_at: new Date().toISOString() });
  },
}));

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}
