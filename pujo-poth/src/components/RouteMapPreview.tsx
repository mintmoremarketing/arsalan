"use client";
import { useEffect, useRef } from "react";
import { useApp } from "@/lib/store";

// Compact, always-on Leaflet map that fits the current routeStops and draws
// the OSRM road-following polyline. Used inside the Route hand-off screen so
// mobile users still see the road path even though the sheet covers the main
// map behind it.
export default function RouteMapPreview({ height = 200 }: { height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const routeStops = useApp((s) => s.routeStops);
  const routeMode = useApp((s) => s.routeMode);
  const user = useApp((s) => s.user);
  const identity = useApp((s) => s.identity);
  const userColor = identity?.color || "#4285f4";

  // Init map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current || mapRef.current) return;
      const m = L.map(ref.current, {
        center: [user.lat, user.lng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(m);
      mapRef.current = m;
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw the route on every stops/mode change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      const m = mapRef.current;
      if (!m || !routeStops.length) return;
      // Wipe previous markers/lines
      m.eachLayer((layer: any) => {
        if (layer.options && (layer instanceof L.Marker || layer instanceof L.Polyline || layer.toGeoJSON)) {
          m.removeLayer(layer);
        }
      });
      // Re-add tile layer if we accidentally nuked it
      const hasTiles = Object.values(m._layers as Record<string, any>).some((l: any) => l._url);
      if (!hasTiles) L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(m);

      // Stops as tiny numbered pins
      routeStops.forEach((s, i) => {
        const isUser = i === 0;
        const isArs = (s.label || "").startsWith("Arsalan");
        const bg = isUser ? userColor : isArs ? "#0a0a0a" : "#E9C15B";
        const fg = isUser || isArs ? "#fff" : "#111";
        const size = isUser ? 12 : 22;
        const border = isArs ? "1.5px solid #E9C15B" : "2px solid #fff";
        const content = isUser ? "" : String(i);
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:${border};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:${fg};box-shadow:0 2px 6px rgba(0,0,0,.5)">${content}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        L.marker([s.lat, s.lng], { icon, interactive: false }).addTo(m);
      });

      // OSRM road polyline
      const coords = routeStops.map((s) => `${s.lng},${s.lat}`).join(";");
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const geo = data.routes?.[0]?.geometry;
        if (!geo || !mapRef.current) return;
        L.geoJSON(geo, {
          style: {
            color: "#E9C15B",
            weight: 4,
            opacity: 0.9,
            dashArray: routeMode === "walking" ? "6 8" : undefined,
            lineCap: "round",
            lineJoin: "round",
          } as any,
        }).addTo(mapRef.current);
      } catch {
        L.polyline(
          routeStops.map((s) => [s.lat, s.lng] as [number, number]),
          { color: "#E9C15B", weight: 3, opacity: 0.7, dashArray: "6 8" }
        ).addTo(m);
      }

      // Fit to the whole route
      const bounds = L.latLngBounds(routeStops.map((s) => [s.lat, s.lng] as [number, number]));
      m.fitBounds(bounds, { padding: [24, 24], animate: false });
    })();
    return () => { cancelled = true; };
  }, [routeStops, routeMode, userColor]);

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        height,
        borderRadius: 14,
        overflow: "hidden",
        background: "#111",
        border: "1px solid rgba(255,255,255,.08)",
      }}
    />
  );
}
