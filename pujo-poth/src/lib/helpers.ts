import type { Pandal, Arsalan, PlannerStop, Lang } from "./types";
import { TXT } from "./i18n";

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function driveMin(km: number) {
  return Math.max(4, Math.round(km * 3.5));
}

export function walkMin(km: number) {
  // ~4.5 km/h through Pujo crowds → 13 min/km
  return Math.max(5, Math.round(km * 13));
}

export function travelMin(km: number, mode: "driving" | "walking") {
  return mode === "walking" ? walkMin(km) : driveMin(km);
}

export function crowdWord(c: number, lang: Lang) {
  return TXT[lang].crowd[Math.max(0, Math.min(4, c - 1))];
}

export function crowdBars(c: number) {
  const heights = ["3px", "5px", "7px", "9px", "11px"];
  return heights.map((h, i) => ({
    h,
    c: i < c ? "#E9C15B" : "rgba(233,193,91,.25)",
  }));
}

export function nearestNeighborOrder<T extends { lat: number; lng: number }>(items: T[], start: T) {
  const remaining = [...items];
  const ordered: T[] = [];
  let cur = start;
  while (remaining.length) {
    let bestIdx = 0;
    let best = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(cur, remaining[i]);
      if (d < best) {
        best = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    cur = next;
  }
  return twoOpt(ordered, start);
}

// 2-opt: repeatedly try reversing subsegments of the route; if the reversal
// shortens the total distance, keep it. This uncrosses the path so the tour
// looks like a clean loop instead of a zig-zag.
function twoOpt<T extends { lat: number; lng: number }>(route: T[], start: T): T[] {
  if (route.length < 3) return route;
  const path = [start, ...route];
  const dist = (i: number, j: number) => haversineKm(path[i], path[j]);
  const total = (r: T[]) => {
    let d = haversineKm(start, r[0]);
    for (let k = 0; k < r.length - 1; k++) d += haversineKm(r[k], r[k + 1]);
    return d;
  };
  let best = [...route];
  let bestLen = total(best);
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 40) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
        const len = total(candidate);
        if (len + 1e-9 < bestLen) {
          best = candidate;
          bestLen = len;
          improved = true;
        }
      }
    }
    void dist;
  }
  return best;
}

export function buildPlan(
  pandals: Pandal[],
  arsalans: Arsalan[],
  startHour: number,
  startMin: number,
  durMin: number,
  start: { lat: number; lng: number },
  mode: "driving" | "walking" = "driving"
): PlannerStop[] {
  if (!pandals.length) return [];

  // Time-budget planner: walk pandals in nearest-neighbor + 2-opt order and
  // keep adding them until the duration is spent (travel + queue-adjusted
  // stopping time). Longer durations naturally fit more pandals.
  const ordered = nearestNeighborOrder(pandals, { lat: start.lat, lng: start.lng } as Pandal);

  // How long to spend AT each pandal, based on its queue + a short "walk-around"
  const stopMin = (p: Pandal) => Math.min(35, Math.max(10, Math.round(p.queueMin * 0.5 + 10)));
  const ARSALAN_STOP_MIN = 40; // sit-down biryani break

  const chosen: Pandal[] = [];
  let cursor = { lat: start.lat, lng: start.lng };
  let spent = 0;
  // Reserve time for the biryani stop we'll insert at the midpoint
  const reserved = ARSALAN_STOP_MIN + travelMin(1.5, mode); // budget for the mid-tour detour
  const budget = Math.max(30, durMin - reserved);

  for (const p of ordered) {
    const travel = travelMin(haversineKm(cursor, p), mode);
    const stop = stopMin(p);
    if (spent + travel + stop > budget) break;
    chosen.push(p);
    spent += travel + stop;
    cursor = { lat: p.lat, lng: p.lng };
  }
  if (chosen.length === 0 && ordered.length) {
    // Ensure at least one pandal even for very short durations
    chosen.push(ordered[0]);
  }

  // Load-balance the Arsalan choice across the whole zone (best of the
  // pandal-assigned outlet or a slightly-farther-but-closer-to-tour one).
  // Compare candidates: each pandal's own assigned Arsalan is a candidate.
  const arsalanCandidateIds = Array.from(new Set(chosen.map((p) => p.arsalanId)));
  const arsalanCandidates = arsalanCandidateIds
    .map((id) => arsalans.find((a) => a.id === id))
    .filter((a): a is Arsalan => !!a);
  const arsalanPool = arsalanCandidates.length ? arsalanCandidates : arsalans;

  // Try inserting the Arsalan at every position in the tour; pick the (arsalan,
  // position) pair with the SHORTEST total tour length. This means if the best
  // Arsalan is right next to the user's start it becomes stop #1; if it's near
  // the end, it becomes the last stop; only if it's actually mid-tour does it
  // land in the middle.
  let bestArs: Arsalan | null = arsalanPool[0] ?? null;
  let bestPos = Math.max(1, Math.floor(chosen.length / 2));
  let bestLen = Infinity;
  for (const ars of arsalanPool) {
    for (let pos = 0; pos <= chosen.length; pos++) {
      // Build a candidate sequence: chosen[0..pos-1] + ars + chosen[pos..]
      let len = 0;
      let cur = { lat: start.lat, lng: start.lng };
      for (let i = 0; i <= chosen.length; i++) {
        if (i === pos) {
          len += haversineKm(cur, ars);
          cur = { lat: ars.lat, lng: ars.lng };
        }
        if (i < chosen.length) {
          len += haversineKm(cur, chosen[i]);
          cur = { lat: chosen[i].lat, lng: chosen[i].lng };
        }
      }
      if (len < bestLen) {
        bestLen = len;
        bestArs = ars;
        bestPos = pos;
      }
    }
  }
  const insertAt = bestPos;
  const ars = bestArs;

  // Per-device time stagger (0–6 min stable). Applied to the Arsalan
  // arrival time so a burst of concurrent planners doesn't all show up
  // at the same outlet at the same minute — some see 8:10, others 8:15.
  const timeStagger = Math.round(deviceJitter());

  const stops: PlannerStop[] = [];
  let t = startHour * 60 + startMin + timeStagger;
  let prev = { lat: start.lat, lng: start.lng };
  const pushArsalan = () => {
    if (!ars) return;
    t += travelMin(haversineKm(prev, ars), mode);
    stops.push({
      kind: "arsalan",
      id: ars.id,
      name: `Arsalan ${ars.shortName}`,
      time: fmtTime(t),
      durMin: ARSALAN_STOP_MIN,
      detail: `Biryani stop · ${ars.waitMin}m wait`,
      lat: ars.lat,
      lng: ars.lng,
      placeName: ars.placeName,
    });
    t += ARSALAN_STOP_MIN;
    prev = { lat: ars.lat, lng: ars.lng };
  };
  // Insertion at position 0 = before the first pandal
  if (insertAt === 0) pushArsalan();
  chosen.forEach((p, i) => {
    t += travelMin(haversineKm(prev, p), mode);
    stops.push({
      kind: "pandal",
      id: p.id,
      name: p.name,
      time: fmtTime(t),
      durMin: stopMin(p),
      detail: `${p.theme} · ~${p.queueMin}m queue`,
      lat: p.lat,
      lng: p.lng,
      placeName: p.placeName,
    });
    t += stopMin(p);
    prev = { lat: p.lat, lng: p.lng };
    // insertAt = k means "after k pandals" (so between i and i+1 when i+1 === k)
    if (i + 1 === insertAt) pushArsalan();
  });
  return stops;
}

export function fmtTime(mins: number) {
  const m = ((mins % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const mn = m % 60;
  const h12 = ((h24 + 11) % 12) + 1;
  const ap = h24 < 12 ? "AM" : "PM";
  return `${h12}:${String(mn).padStart(2, "0")} ${ap}`;
}

export function googleMapsRoute(
  stops: { placeName?: string; lat: number; lng: number }[],
  mode: "driving" | "walking" = "driving"
) {
  const parts = stops.map((s) =>
    s.placeName ? encodeURIComponent(s.placeName) : `${s.lat},${s.lng}`
  );
  const travel = mode === "walking" ? "walking" : "driving";
  // /data segment forces the travel mode. If we only used ?travelmode= it
  // still opens the picker; adding !3e2 (walking) / !3e0 (driving) locks it.
  const dataFlag = mode === "walking" ? "!3e2" : "!3e0";
  return `https://www.google.com/maps/dir/${parts.join("/")}/data=${dataFlag}?travelmode=${travel}`;
}

// Turn-by-turn navigation URL: opens Google Maps directions from user's live
// location to the destination in the requested travel mode.
// Directions API URL scheme reference: https://developers.google.com/maps/documentation/urls/get-started#directions-action
export function navigateUrl(
  from: { lat: number; lng: number },
  to: { placeName?: string; lat: number; lng: number },
  mode: "driving" | "walking" = "driving"
) {
  const dest = to.placeName ? encodeURIComponent(to.placeName) : `${to.lat},${to.lng}`;
  const travel = mode === "walking" ? "walking" : "driving";
  return `https://www.google.com/maps/dir/?api=1` +
    `&origin=${from.lat},${from.lng}` +
    `&destination=${dest}` +
    `&travelmode=${travel}` +
    `&dir_action=navigate`;
}

export function pandalPhoto(p: Pandal) {
  return p.photoUrl || `https://picsum.photos/seed/${encodeURIComponent(p.name)}/400/240`;
}

// Stable per-device jitter, 0–6 minutes. Used so that many users opening the
// app at the same instant don't all pick the same "best" Arsalan.
function deviceJitter(): number {
  if (typeof window === "undefined") return 0;
  let seed = localStorage.getItem("pujoJitterSeed");
  if (!seed) {
    seed = String(Math.floor(Math.random() * 1e9));
    localStorage.setItem("pujoJitterSeed", seed);
  }
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  return (Math.abs(h) % 61) / 10; // 0.0 – 6.0 min
}

export interface ArsalanChoice {
  arsalan: Arsalan;
  travelMin: number;
  waitMin: number;
  totalMin: number;
  km: number;
}

// Pick the outlet that gets the user fed fastest, weighted by real-time wait.
// Load-balances organically: as waits rise at popular branches, the algorithm
// steers new users to quieter ones.
export function pickBestArsalan(
  from: { lat: number; lng: number },
  arsalans: Arsalan[],
  liveWaits: Record<string, number> = {},
  mode: "driving" | "walking" = "driving"
): { best: ArsalanChoice; ranked: ArsalanChoice[] } | null {
  if (!arsalans.length) return null;
  const jitter = deviceJitter();
  const ranked: ArsalanChoice[] = arsalans
    .map((a) => {
      const km = haversineKm(from, a);
      const travel = travelMin(km, mode);
      const wait = liveWaits[a.id] ?? a.waitMin ?? 20;
      // Score: travel + wait + (small stable jitter, applied per outlet so it
      // doesn't disappear when you tie two together)
      const score = travel + wait + jitter * ((a.id.charCodeAt(0) + a.id.length) % 3);
      return { arsalan: a, travelMin: travel, waitMin: wait, totalMin: Math.round(score), km };
    })
    .sort((a, b) => a.totalMin - b.totalMin);
  return { best: ranked[0], ranked };
}

// Just the "closest" outlet — used only when we specifically need geographic
// nearness (e.g. pandal-level assigned Arsalan). Prefer pickBestArsalan.
export function nearestArsalan(from: { lat: number; lng: number }, arsalans: Arsalan[]) {
  return [...arsalans]
    .map((a) => ({ ...a, km: haversineKm(from, a) }))
    .sort((a, b) => a.km - b.km)[0];
}
