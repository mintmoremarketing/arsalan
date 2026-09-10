// Zones are user-defined via the admin panel; keep the type open.
export type ZoneId = string;
export type Lang = "en" | "bn";
export type Screen = "map" | "planner" | "pandal" | "arsalan" | "route" | "search" | "friends";

export interface Zone {
  id: ZoneId;
  name: string;
  nameBn: string;
  color: string;
}

export interface Arsalan {
  id: string;
  zoneId: ZoneId;
  name: string;
  shortName: string;
  placeName: string;
  mapsLink: string;
  rating: number;
  lat: number;
  lng: number;
  openHours: string;
  waitMin: number;
  photoUrl?: string;
}

export interface Pandal {
  id: string;
  zoneId: ZoneId;
  name: string;
  nameBn: string;
  placeName: string;
  mapsLink: string;
  rating: number;
  photoUrl?: string;
  lat: number;
  lng: number;
  theme: string;
  themeBn?: string;
  queueMin: number;
  crowd: 1 | 2 | 3 | 4 | 5;
  arsalanId: string;
}

export interface Identity {
  id: string;
  name: string;
  color: string;
}

export interface Friend {
  id: string;
  name: string;
  color: string;
  lat: number;
  lng: number;
  at: string;
  updatedAt: number;
}

export interface PlannerStop {
  kind: "pandal" | "arsalan";
  id: string;
  name: string;
  time: string;
  durMin: number;
  detail: string;
  lat: number;
  lng: number;
  placeName?: string;
}
