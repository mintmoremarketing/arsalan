# Pujo Poth — Extremely Detailed Handoff for Claude Code

## ⚠️ READ THIS FIRST — CRITICAL INSTRUCTION

**DO NOT REBUILD THE UI. DO NOT REWRITE THE FRONTEND.**

The file `Pujo Poth.dc.html` is the **complete, final, pixel-perfect frontend**. Every color, font, animation, layout, padding, card, sheet, transition, map behavior, and interaction was designed and refined over hundreds of iterations. Your job is to:

1. Add a **real backend** (Supabase) behind the existing UI
2. Wire **real data** into the existing state/render system
3. Add **Google Places photo fetching** to the admin panel
4. Deploy the app

If you find yourself rewriting HTML, stop. You are doing the wrong thing.

---

## What This App Is

**Pujo Poth** ("Pujo Path") is a mobile-first event companion app for Durga Pujo in Kolkata, India. Every year, thousands of elaborately themed temporary temples ("pandals") are built across the city. People "pandal hop" — visiting as many as possible over several nights. The app helps users:

1. **Discover** pandals on a live map, filtered by area of the city
2. **Check crowd levels** at each pandal in real time so they can avoid queues
3. **Find the nearest Arsalan** restaurant (a legendary Kolkata biryani chain) relative to their current pandal
4. **Plan a full evening route** — pick a start time and duration, app generates a timed itinerary
5. **Track friends** on the map with colored live dots — no login required
6. **Get a Google Maps multi-stop route** for the whole night

---

## The Frontend Is Done. Here Is Exactly What It Does.

### Map Screen
- Full-screen Leaflet.js map (OpenStreetMap tiles, dark-filtered)
- Map tile filter CSS: `invert(1) hue-rotate(200deg) brightness(.65) contrast(.85) saturate(.6)`
- Min zoom: 11 (can zoom out to see full city), no max zoom (zoom to street level)
- Map pans but never hides — it stays mounted even when sheets slide up over it
- **Pandal markers**: 48px circle, photo as background, gold border 2.5px, number badge top-right (17px, dark bg, gold text), pandal name label below (white pill with backdrop blur)
- **Arsalan markers**: 44px black circle, Arsalan logo (filter: invert hue-rotate to gold), shadow
- **Friend dots**: 18px colored circles, white border 2px, pulse animation when "sharing"
- **User location dot**: 18px, #4285f4 blue fill, lighter border, gentle pulse ring

**Top bar (z-index 900)**:
- Search pill (flex:1, dark glass) that opens Search screen
- Language toggle button (shows বাং/ENG, 42×42, dark glass)
- Recenter button (42×42, dark glass, blue crosshair icon)
- Positioned: top: 68px, left/right: 14px (below phone status bar)

**Zone pills (z-index 900)**:
- Three pills: North / South / Behala (labels in English or Bengali based on lang state)
- Each shows pandal count for that zone
- Active pill: gold (#E9C15B) background, black text
- Inactive: rgba(255,255,255,.06) bg, muted text
- Row positioned: top: 122px, left/right: 14px

**Bottom overlay (z-index 900)**:
- Gradient from `#141921` (solid bottom) fading to transparent
- **Arsalan bar**: pill-shaped, dark glass (rgba(10,10,10,.88) + backdrop-blur 18px), centered, contains: Arsalan logo (28px) + outlet name + distance in km + "NEAREST ARSALAN" label
- **Card rail**: horizontal scroll, scroll-snap mandatory, gap 12px, 14px padding sides
  - Each card: 220px wide, 18px radius, dark border, cursor pointer
  - Card header: 120px tall, pandal photo (picsum seeded by name, replace with real), gradient overlay
  - Number badge top-right: 26×26, 8px radius, dark bg, pandal number
  - Crowd pill bottom-left: dark rounded, crowd word (Calm / Busy / Packed)
  - Card body: pandal name 15px/700, detail line 10.5px muted, distance
  - Clicking a card: opens Pandal Detail bottom sheet AND pans map to that pandal's marker

### Pandal Detail Bottom Sheet (mobile)
- Slides up from bottom over the map. Map stays visible behind it.
- Animation: translateY(110% → 0), 280ms, cubic-bezier(.22,1,.36,1)
- Closing animation: translateY(0 → 115%), 260ms, ease-in
- backdrop tap closes it
- border-radius: 24px 24px 0 0; max-height: 82vh; overflow-y: auto
- Drag handle: 38×4px, rounded, rgba(255,255,255,.18), centered, margin-top 10px
- Header: zone label (10.5px/800, gold, all-caps, letter-spacing) + pandal name (27px/900, #f0eeec) + × close button (top-right)
- Crowd chips row: crowd word pill (gold bg, black text) + "Queue ~X min" pill + theme pill
- Arsalan card: gold-tinted bg (rgba(gold,.1)), gold border, Arsalan logo 40px, outlet name, distance/time, hours, big "X km" right-aligned in gold
- Route CTA: full-width gold shimmer button, black text "Open Route in Maps →", black arrow icon

### Arsalan Outlet Sheet (mobile)
- Bottom sheet, max-height 90vh, same enter/exit animation
- Header: Arsalan logo in 52px dark square + "THE STOP" caps label + outlet name 24px/900 + km + hours
- Wait card: big number 56px/900 gold (current wait time in minutes) + horizontal bar chart (8 bars for 8 time slots, current hour bar = gold, others = dim)
- Live count badge: green dot + "X people here now" (simulated, replace with Supabase count)
- Menu list: item name (13px/600) left + price (13px/800 gold) right, dividers
- Route CTA: full-width gold shimmer button, black text

### Day Planner Screen
Full-screen overlay (z-index 10, bg #111), flex column, fadeIn 0.2s

**Header section**:
- Back button (36×36, dark, back chevron)
- Title: "Day Planner" / "দিনের পরিকল্পনা" (22px/800)
- Picker card: rounded 18px, subtle border, internal padding 16px
  - Left column (flex:1): "START TIME" label (9px caps) + drum rollers
    - **Hour drum**: ↑ button (34px wide, 22px tall, 7px radius) + big number (32px/800) + ↓ button. Scroll wheel also works.
    - Colon separator: 28px/800, gold (#E9C15B)
    - **Minutes tens drum**: same buttons (28px wide) + single digit (32px/800). Increments by 10 (0,1,2,3,4,5). Scroll wheel works.
    - **Minutes units drum**: same buttons (28px wide) + single digit (32px/800). Increments by 1 (0–9). Scroll wheel works.
    - **AM/PM stack**: two small buttons (padding 5px 8px, 8px radius) stacked vertically. Active = gold bg, black text. Inactive = dim.
  - Vertical 1px divider (rgba(255,255,255,.07))
  - Right column (min-width 76px): "DURATION" label + ↑ number ↓ stepper
    - Number shows e.g. "2h" or "3h30"
    - Increments 30 min at a time, range 30min–8h
    - ↑ button: gold-tinted (rgba(gold,.15)); ↓ button: dark

**Stop cards** (scrollable list below picker):
- Each card: rounded 18px, subtle border, flex row, left accent bar 3px (color = card type)
  - Icon circle 44px (pandal = numbered circle, Arsalan = logo)
  - Content: stop name (15px/700), detail line (11px/muted, e.g. "Theme · Zone")
  - Right: time (13px/700, color based on type) + duration (10px, muted)
- Arsalan stops: gold-tinted card bg, gold accent bar, Arsalan logo icon
- Pandal stops: subtle dark bg, gold accent bar, numbered circle

**Bottom bar** (fixed):
- Summary line: "Back by X:XX PM" + calculated end time (gold)
- "Launch in Maps" gold shimmer button — calls Google Maps multi-stop URL directly (does NOT go to route screen on desktop)

### Friends / Group Screen
**First time** (no name in localStorage):
- "Set your dot" heading
- Name input (placeholder "Your name", max 10 chars, dark input with gold focus ring)
- Color grid: 16 colors in 4×4 grid, 32px circles, white border on selected
  - Colors: #E9C15B, #ef4444, #3b82f6, #22c55e, #a855f7, #f97316, #06b6d4, #ec4899, #84cc16, #f59e0b, #14b8a6, #6366f1, #f43f5e, #8b5cf6, #10b981, #0ea5e9
- "Save & Share My Dot" gold button

**Returning user** (name+color in localStorage):
- My dot preview: colored 44px square, rounded, name initials inside
- Name + "is sharing" / "not sharing"
- Share toggle: 46×28 pill, animated knob, gold when on
- Friends list (4 simulated friends):
  - Colored 44px avatar square with name initials
  - Name (14px/700) + current pandal (11px/muted) + time ago (right, muted)
  - Friend tap: map pans to that friend's location
- "Edit name or colour" small link below toggle (opens inline edit — same color grid + name input)

### Search Screen
Full-screen, dark bg
- Input row at top: magnifier icon + text input (transparent bg, gold focus underline)
- Filter chips (horizontal scroll below input): "Less Crowded", "Calm Only", "Under 15 min queue", zone chips — each is a toggle pill
- Results list as user types:
  - Pin icon + pandal name (13px/700) + zone + crowd word + km distance right (gold)
  - Tapping result: goes to map, opens that pandal's detail sheet

### Route Screen (mobile only)
Full-screen handoff before opening Google Maps
- Top 45%: Arsalan photo full-bleed, dark gradient overlay
  - Back button top-left (blur dark circle, 40×40)
  - Gold number 100px/900 in center
  - "KM TO BIRYANI" caps label below
- Bottom panel: rounded 24px top corners
  - "FROM: [current pandal]" → "TO: Arsalan [name]" with arrow
  - Stats row: walk time, queue time, total
  - "Open in Google Maps" gold shimmer button — URL: `https://www.google.com/maps/dir/[from lat,lng]/[arsalan lat,lng]`

---

## Desktop Layout (≥1024px) — THREE PANEL

The app detects `window.matchMedia('(min-width:1024px)')` and switches to a full-screen three-panel desktop layout. The mobile phone UI is hidden.

**Left sidebar (272px, background #0f0f0f)**:
- Header: logo in dark 34px rounded square + "Pujo Poth" 16px/800 + "Durga Pujo 2025" subtitle + LIVE green pill
- Zone pills: 3 buttons, each shows COUNT big (22px/900) + zone label (10px/700)
  - Active: gold bg, black text; Inactive: dark bg, dim text
- Pandal list (scrollable, flex:1):
  - Each row: 42px photo thumbnail (rounded 10px) + name (13px/700) + distance+theme (10.5px/muted) + crowd bars right
  - Clicking: sets selected pandal, right panel shows pandal detail
- Arsalan bar (bottom, border-top): gold-tinted pill with logo + outlet name + distance + route arrow icon

**Center (flex:1)**: Full Leaflet map, always visible. Map controls (search pill + recenter) top.

**Right sidebar (360px, background #111)**:
- Tab bar at top: Plan | Map | Find | Group
  - Gold underline on active tab, gold label; inactive = dim label
- **Map tab (default)**: Arsalan details always shown
  - Hero photo 170px (object-fit cover, gradient overlay)
  - Zone + outlet name + distance in overlay
  - Wait time card: big number + 8 bar chart
  - Menu list
  - Route button (gold shimmer, opens Google Maps directly — NOT route screen)
- **Pandal selected** (from sidebar click): replaces Map default
  - Pandal hero photo 180px
  - Crowd chips (crowd word + queue + theme)
  - Arsalan card (logo + name + distance)
  - Route button (opens Google Maps directly)
- **Plan tab**: Shows planner with time pickers (same drum rollers, scaled smaller) + stop list + summary
- **Find tab**: Search input + filter chips + results list
- **Group tab**: Friends list / setup flow (same as mobile)

---

## Tweakable Props (Tweaks Panel)

Three built-in tweaks:
1. **Default Language** (segmented: English / বাংলা) — entire UI switches language on load
2. **Home Zone** (select: North / South / Behala) — which zone is selected by default
3. **Show Crowd Info** (boolean toggle) — hides all crowd words, wait times, queue data when off

---

## What Claude Code Needs to Build

### 1. Supabase Schema

```sql
-- Pandals (seeded from admin panel)
create table pandals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_bn text,
  zone text check (zone in ('north','south','behala')),
  lat float8, lng float8,
  theme text,
  maps_link text,
  place_id text,
  photo_url text,
  updated_at timestamptz default now()
);

-- Arsalan outlets
create table arsalan_outlets (
  id uuid primary key default gen_random_uuid(),
  short_name text,
  full_name text,
  lat float8, lng float8,
  maps_link text,
  place_id text,
  photo_url text,
  open_hours text,
  rating float4
);

-- Live presence (no auth needed)
create table presence (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  display_name text,
  color text,
  lat float8, lng float8,
  pandal_name text,
  group_code text,
  updated_at timestamptz default now()
);

-- Crowd reports (aggregated)
create table crowd_reports (
  id uuid primary key default gen_random_uuid(),
  pandal_id uuid references pandals(id),
  crowd_level int check (crowd_level between 1 and 5),
  queue_min int,
  reported_at timestamptz default now()
);

-- Arsalan wait times
create table arsalan_waits (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references arsalan_outlets(id),
  wait_min int,
  people_count int,
  reported_at timestamptz default now()
);
```

Enable Supabase Realtime on `presence` and `crowd_reports` tables.

### 2. Replace localStorage admin data with Supabase fetch

In the main app, on componentDidMount, fetch pandals + arsalan_outlets from Supabase and replace the hardcoded PANDALS and ARSALAN_LIST arrays. Cache in localStorage for offline fallback.

```javascript
const {data: pandals} = await supabase.from('pandals').select('*');
const {data: arsalan} = await supabase.from('arsalan_outlets').select('*');
// Store in localStorage as 'pujoLiveData'
// App reads this on every load
```

### 3. Replace simulated crowd with Supabase Realtime

Current simulation (setInterval 25000ms) picks random crowd changes. Replace with:

```javascript
// Subscribe to crowd_reports channel
supabase
  .channel('crowd')
  .on('postgres_changes', {event: 'INSERT', schema: 'public', table: 'crowd_reports'},
    payload => {
      this.setState(st => ({
        simCrowds: {...st.simCrowds, [payload.new.pandal_id]: payload.new.crowd_level}
      }));
    }
  ).subscribe();
```

### 4. Replace simulated friends with Supabase Realtime

Device identity (no login):
```javascript
// On app load
let deviceId = localStorage.getItem('pujoDeviceId');
if (!deviceId) { deviceId = crypto.randomUUID(); localStorage.setItem('pujoDeviceId', deviceId); }

// When user enables sharing
await supabase.from('presence').upsert({
  device_id: deviceId,
  display_name: this.state.setupName,
  color: this.state.setupColor,
  group_code: this.state.groupCode,
  pandal_name: this.state.sel,
  updated_at: new Date().toISOString()
});

// Subscribe to group presence
supabase
  .channel('group-' + groupCode)
  .on('postgres_changes', {event: '*', schema: 'public', table: 'presence',
    filter: 'group_code=eq.' + groupCode},
    payload => { /* update simFriends state */ }
  ).subscribe();
```

### 5. Group code system (no auth)

```javascript
// Create group
createGroup() {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  localStorage.setItem('pujoGroupCode', code);
  this.setState({groupCode: code});
  // Share URL: window.location.origin + '?join=' + code
}

// Join group on load
const url = new URLSearchParams(window.location.search);
const joinCode = url.get('join');
if (joinCode) { this.setState({groupCode: joinCode}); }
```

### 6. Google Places API (in admin panel arsalanadmin.html)

The admin panel has a "Fetch from Google Places" button per pandal/outlet. Wire it to:
```
POST https://places.googleapis.com/v1/places:searchText
X-Goog-Api-Key: YOUR_KEY
X-Goog-FieldMask: places.id,places.displayName,places.location,places.photos,places.rating

{textQuery: "Arsalan New Market Kolkata"}
```

For photo URLs:
```
https://places.googleapis.com/v1/{photo.name}/media?key=KEY&maxWidthPx=800
```

Store the photo URL in the pandal/arsalan record in Supabase.

### 7. OSRM Road Routing (map polylines)

Currently draws straight lines between pandals. Replace with:
```javascript
const coords = stops.map(s => s.lng + ',' + s.lat).join(';');
const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
const data = await res.json();
const line = L.geoJSON(data.routes[0].geometry, {color: '#E9C15B', weight: 3, opacity: 0.7});
line.addTo(this.lmap);
```

---

## Environment Variables Needed

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GOOGLE_PLACES_KEY=
```

---

## What NOT To Change

- Colors: #111111 (bg), #E9C15B (gold), #f0eeec (text). Do not add new colors.
- Font: Plus Jakarta Sans + Noto Serif Bengali. Do not swap fonts.
- All animations (sheet slides, card snaps, gold shimmer button, dot pulse)
- Bottom tab bar layout and behavior (pill, active expansion, gold)
- Map filter (the dark invert CSS on tiles)
- Marker design (photo circles with number badges, not default Leaflet pins)
- The drum-roller time picker (H drum, M-tens drum, M-units drum, AM/PM)
- The three-panel desktop layout

---

## Files In This Package

- `Pujo Poth.dc.html` — Complete frontend prototype. Open in browser to see everything.
- `arsalanadmin.html` — Admin panel for managing data.
- `arsalan-logo.png` — Arsalan restaurant logo asset.
- `README.md` — This file.
