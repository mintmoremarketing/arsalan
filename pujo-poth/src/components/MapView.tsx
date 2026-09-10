"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LMap, Marker as LMarker, Polyline as LPolyline } from "leaflet";
import { useApp } from "@/lib/store";
import { pandalPhoto, nearestNeighborOrder } from "@/lib/helpers";

export default function MapView({ heightClass = "absolute inset-0" }: { heightClass?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const markersRef = useRef<LMarker[]>([]);
  const routeLineRef = useRef<LPolyline | null>(null);
  const userMarkerRef = useRef<LMarker | null>(null);
  const lastFittedZoneRef = useRef<string | null>(null);
  const pandals = useApp((s) => s.pandals);
  const arsalans = useApp((s) => s.arsalans);
  const friends = useApp((s) => s.friends);
  const user = useApp((s) => s.user);
  const zone = useApp((s) => s.zone);
  const routeStops = useApp((s) => s.routeStops);
  const routeMode = useApp((s) => s.routeMode);
  const setSelPandal = useApp((s) => s.setSelPandal);
  const setSelArsalan = useApp((s) => s.setSelArsalan);
  const go = useApp((s) => s.go);
  const [zoom, setZoom] = useState(13);
  const identity = useApp((s) => s.identity);
  const userColor = identity?.color || "#4285f4";

  // Init map
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current || mapRef.current) return;
      const m = L.map(ref.current, {
        center: [user.lat, user.lng],
        zoom: 13,
        minZoom: 11,
        maxZoom: 19,
        zoomControl: true,
        zoomAnimation: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
        attributionControl: false,
      });
      m.zoomControl.setPosition("bottomright");
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(m);
      mapRef.current = m;
      // Track zoom so we can progressively reveal markers.
      setZoom(m.getZoom());
      m.on("zoomend", () => setZoom(m.getZoom()));
      userMarkerRef.current = L.marker([user.lat, user.lng], { icon: makeUserIcon(L, userColor), interactive: false, zIndexOffset: 1000 }).addTo(m);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render markers
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      const m = mapRef.current;
      if (!m || cancelled) return;
      // Guard: the container may already be removed by strict-mode double-effect
      if (!(m as any)._container || !(m as any)._container.isConnected) return;
      markersRef.current.forEach((mk) => mk.remove());
      markersRef.current = [];

      const zonePandalsRaw = pandals.filter((p) => p.zoneId === zone);
      // Number in tour order — same TSP nearest-neighbor the planner uses
      const zonePandalsAll = nearestNeighborOrder(zonePandalsRaw, { lat: user.lat, lng: user.lng } as any);
      const numMap = new Map(zonePandalsAll.map((p, i) => [p.id, i + 1]));

      // Overlap-based declustering: iterate pandals (higher-rated first as
      // tie-breaker), convert each to screen pixels at the current zoom, and
      // only show it if it's more than `minSpacingPx` from every already-
      // picked pin. As the user zooms in, marker centres separate on-screen,
      // so more of them pass the test.
      const MARKER_PX = 42;              // Marker diameter in CSS
      const minSpacingPx = MARKER_PX + 8;
      const placed: { x: number; y: number }[] = [];
      const zonePandals: typeof zonePandalsAll = [];
      const scored = zonePandalsAll
        .map((p) => ({ p, score: p.rating + p.queueMin * 0.02 }))
        .sort((a, b) => b.score - a.score);
      for (const { p } of scored) {
        const pt = m.latLngToContainerPoint([p.lat, p.lng]);
        const ok = placed.every((q) => Math.hypot(q.x - pt.x, q.y - pt.y) >= minSpacingPx);
        if (ok) {
          placed.push({ x: pt.x, y: pt.y });
          zonePandals.push(p);
        }
      }
      zonePandals.forEach((p) => {
        const i = numMap.get(p.id)! - 1;
        const icon = L.divIcon({
          className: "",
          html: `<div class="pandal-marker" style="background-image:url('${pandalPhoto(p)}')">
            <div class="num">${i + 1}</div>
            <div class="lbl">${p.name}</div>
          </div>`,
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        });
        const mk = L.marker([p.lat, p.lng], { icon }).addTo(m);
        mk.on("click", () => {
          setSelPandal(p.id);
          go("pandal");
        });
        markersRef.current.push(mk);
      });

      // Arsalans: pick relevant ones (assigned to a pandal in the zone OR an
      // active tour stop) and declusters them against already-placed markers
      // so a pandal pin and an Arsalan pin never overlap.
      const relevantArsIds = new Set(zonePandalsAll.map((p) => p.arsalanId));
      const routeStopKey = new Set(routeStops.map((s) => `${s.lat.toFixed(4)},${s.lng.toFixed(4)}`));
      const ARS_PX = 44;
      const arsMinSpacingPx = ARS_PX + 8;
      const candidateArs: typeof arsalans = [];
      const sortedRelevant = arsalans
        .filter((a) => relevantArsIds.has(a.id) || routeStopKey.has(`${a.lat.toFixed(4)},${a.lng.toFixed(4)}`))
        .map((a) => ({ a, d: (a.lat - user.lat) ** 2 + (a.lng - user.lng) ** 2 }))
        .sort((x, y) => x.d - y.d)
        .map((x) => x.a);
      for (const a of sortedRelevant) {
        const pt = m.latLngToContainerPoint([a.lat, a.lng]);
        const ok = placed.every((q) => Math.hypot(q.x - pt.x, q.y - pt.y) >= arsMinSpacingPx);
        if (ok) {
          placed.push({ x: pt.x, y: pt.y });
          candidateArs.push(a);
        }
      }
      candidateArs.forEach((a) => {
          const icon = L.divIcon({
            className: "",
            html: `<div class="arsalan-marker"><img src="/arsalan-logo.png" alt=""/></div>`,
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          });
          const mk = L.marker([a.lat, a.lng], { icon }).addTo(m);
          mk.on("click", () => {
            setSelArsalan(a.id);
            go("arsalan");
          });
          markersRef.current.push(mk);
        });

      friends.forEach((f) => {
        const icon = L.divIcon({
          className: "",
          html: `<div class="friend-dot" style="background:${f.color}"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        const mk = L.marker([f.lat, f.lng], { icon }).addTo(m);
        markersRef.current.push(mk);
      });

      // Fit to zone ONCE per zone change. If we ran this on every effect
      // (which fires on zoom changes too), zooming in would shrink the map
      // bounds, trip the "not contained" check, and snap us back out — a
      // feedback loop that made pinch-zoom feel broken.
      if (
        zonePandalsAll.length &&
        !cancelled &&
        (m as any)._container?.isConnected &&
        lastFittedZoneRef.current !== zone
      ) {
        try {
          const bounds = L.latLngBounds(zonePandalsAll.map((p) => [p.lat, p.lng] as [number, number]));
          m.fitBounds(bounds, { padding: [80, 80], animate: false, maxZoom: 13 });
          lastFittedZoneRef.current = zone;
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [pandals, arsalans, friends, zone, routeStops, zoom, go, setSelPandal, setSelArsalan, user.lat, user.lng]);

  // Recenter signal → pan to user
  const recenterSignal = useApp((s) => s.recenterSignal);
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !(m as any)._container?.isConnected) return;
    if (recenterSignal === 0) return;
    m.flyTo([user.lat, user.lng], Math.max(m.getZoom(), 15), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterSignal]);

  // Live-update user marker position when store user changes
  useEffect(() => {
    const mk = userMarkerRef.current;
    const m = mapRef.current;
    if (!mk || !m || !(m as any)._container?.isConnected) return;
    mk.setLatLng([user.lat, user.lng]);
  }, [user.lat, user.lng]);

  // Re-skin the user marker whenever the identity colour changes.
  useEffect(() => {
    (async () => {
      const mk = userMarkerRef.current;
      const m = mapRef.current;
      if (!mk || !m || !(m as any)._container?.isConnected) return;
      const L = (await import("leaflet")).default;
      mk.setIcon(makeUserIcon(L, userColor));
    })();
  }, [userColor]);

  // OSRM road-route polyline
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      const m = mapRef.current;
      if (!m || !(m as any)._container?.isConnected) return;

      // Clear previous route
      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }
      if (routeStops.length < 2) return;

      // OSRM only exposes 'driving' publicly; walking still uses road network,
      // just approximated by taking the same driving path (or use straight lines for very short walks).
      const profile = "driving";
      const coords = routeStops.map((s) => `${s.lng},${s.lat}`).join(";");
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const geo = data.routes?.[0]?.geometry;
        if (!geo || !mapRef.current || !(mapRef.current as any)._container?.isConnected) return;
        const line = L.geoJSON(geo, {
          style: {
            color: "#E9C15B",
            weight: 4,
            opacity: 0.85,
            dashArray: routeMode === "walking" ? "6 8" : undefined,
            lineCap: "round",
            lineJoin: "round",
          } as any,
        }) as unknown as LPolyline;
        line.addTo(mapRef.current);
        routeLineRef.current = line;
      } catch {
        // Fallback: draw straight polyline through stops
        if (!mapRef.current) return;
        const line = L.polyline(routeStops.map((s) => [s.lat, s.lng] as [number, number]), {
          color: "#E9C15B",
          weight: 3,
          opacity: 0.7,
          dashArray: "6 8",
        });
        line.addTo(mapRef.current);
        routeLineRef.current = line;
      }
    })();
    return () => { cancelled = true; };
  }, [routeStops, routeMode]);

  return <div ref={ref} className={heightClass} style={{ background: "#111" }} />;
}

// Blue Google-style dot by default; recolored to the user's Group identity
// colour when they've set one. Alpha blend of the same hex for the pulse ring.
function makeUserIcon(L: typeof import("leaflet"), color: string) {
  const c = color.replace("#", "");
  const rgba = (a: number) => {
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:48px;height:48px;transform:translate(-50%,-50%)">
      <div style="position:absolute;inset:0;border-radius:50%;background:${rgba(0.3)};animation:dotPulse 2.2s ease-out infinite"></div>
      <div style="position:absolute;inset:15px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 2px 10px ${rgba(0.7)}"></div>
    </div>`,
    iconSize: [0, 0],
  });
}
