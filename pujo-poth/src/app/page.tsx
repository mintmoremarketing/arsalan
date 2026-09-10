"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import MapScreen from "@/components/MapScreen";
import PandalSheet from "@/components/PandalSheet";
import ArsalanSheet from "@/components/ArsalanSheet";
import PlannerScreen from "@/components/PlannerScreen";
import SearchScreen from "@/components/SearchScreen";
import FriendsScreen from "@/components/FriendsScreen";
import RouteScreen from "@/components/RouteScreen";
import TabBar from "@/components/TabBar";
import DesktopShell from "@/components/DesktopShell";

export default function Home() {
  const { screen, isDesktop, setDesktop, loadData, subscribeFriends, identity, share, user, selPandalId, pandals, arsalans, setRouteStops } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch("/api/hit", { method: "POST" }).catch(() => {});
    // ?join=CODE joins the sender's crew before subscribing to presence
    const params = new URLSearchParams(window.location.search);
    const j = params.get("join");
    if (j) {
      useApp.getState().joinGroup(j);
      // Clean the URL so a refresh doesn't rejoin (they're already saved)
      const url = new URL(window.location.href);
      url.searchParams.delete("join");
      window.history.replaceState({}, "", url.toString());
    }
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    loadData();
    const unsub = subscribeFriends();
    const unsubWaits = useApp.getState().subscribeWaits();
    return () => {
      mq.removeEventListener("change", sync);
      unsub();
      unsubWaits();
    };
  }, [loadData, setDesktop, subscribeFriends]);

  // Live geolocation tracking
  useEffect(() => {
    if (!navigator.geolocation) return;
    const onPos = (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      // Ignore very fuzzy fixes (>1km) — usually IP geolocation, not GPS
      if (accuracy && accuracy > 1000) return;
      const prev = useApp.getState().user;
      // Only update if moved > 5 metres to avoid re-render churn
      const moved = Math.hypot((lat - prev.lat) * 111000, (lng - prev.lng) * 111000 * Math.cos(lat * Math.PI / 180));
      if (moved < 5) return;
      useApp.setState({ user: { lat, lng } });
    };
    const onErr = (err: GeolocationPositionError) => {
      console.warn("geolocation:", err.message);
    };
    // First quick fix, then watch
    navigator.geolocation.getCurrentPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });
    const wid = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 20000,
    });
    return () => navigator.geolocation.clearWatch(wid);
  }, []);

  // Push position when sharing
  useEffect(() => {
    if (!share || !identity) return;
    useApp.getState().pushMyPosition();
    const iv = setInterval(() => useApp.getState().pushMyPosition(), 20000);
    return () => clearInterval(iv);
  }, [share, identity, user]);

  // Mobile: draw a route polyline whenever a pandal is selected (any screen
  // where the map is either behind the sheet or peeking above it). The pandal
  // sheet only covers ~2/3 of the screen, so the top slice of the map + the
  // route line remain visible; on the Route hand-off screen we also render a
  // mini-map preview from the same routeStops.
  useEffect(() => {
    if (isDesktop) return;
    const p = pandals.find((x) => x.id === selPandalId);
    if (p && (screen === "map" || screen === "pandal" || screen === "route")) {
      const ars = arsalans.find((a) => a.id === p.arsalanId);
      const stops = [{ lat: user.lat, lng: user.lng, label: "You" }, { lat: p.lat, lng: p.lng, label: p.name }];
      if (ars) stops.push({ lat: ars.lat, lng: ars.lng, label: `Arsalan ${ars.shortName}` });
      setRouteStops(stops);
    } else if (!p && screen === "map") {
      setRouteStops([]);
    }
  }, [isDesktop, selPandalId, screen, pandals, arsalans, user, setRouteStops]);

  if (!mounted) return null;

  if (isDesktop) {
    return (
      /* Desktop: right pane handles pandal/arsalan/planner/search/friends inline */
      <DesktopShell />
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#111" }}>
      <MapScreen />
      {(screen === "pandal" || (screen === "map" && useApp.getState().selPandalId && useApp.getState().closingSheet === "pandal")) && <PandalSheet />}
      {(screen === "arsalan" || (screen === "map" && useApp.getState().selArsalanId && useApp.getState().closingSheet === "arsalan")) && <ArsalanSheet />}
      {screen === "planner" && <PlannerScreen />}
      {screen === "search" && <SearchScreen />}
      {screen === "friends" && <FriendsScreen />}
      {screen === "route" && <RouteScreen />}
      <TabBar />
    </div>
  );
}
