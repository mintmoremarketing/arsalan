export const IconSearch = ({ o = 0.4 }: { o?: number }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="8" stroke={`rgba(255,255,255,${o})`} strokeWidth="1.9" />
    <path d="M16.5 16.5L21 21" stroke={`rgba(255,255,255,${o})`} strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);
export const IconLocate = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke="#4285f4" strokeWidth="1.8" fill="#4285f4" fillOpacity=".2" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="#4285f4" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);
export const IconRoute = ({ color = "#E9C15B" }: { color?: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M3 11l18-8-8 18-2-8-8-2z" fill={color} opacity="0.3" />
    <path d="M3 11l18-8-8 18-2-8-8-2z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);
export const IconBack = () => (
  <svg width="10" height="17" viewBox="0 0 12 20" fill="none">
    <path d="M10 2L2 10l8 8" stroke="#f0eeec" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
export const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 18 18" fill="none">
    <path d="M2 2l14 14M16 2L2 16" stroke="rgba(255,255,255,.45)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
export const IconMapPin = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 2a7 7 0 0 1 7 7c0 4.5-7 13-7 13S5 13.5 5 9a7 7 0 0 1 7-7z" fill="#E9C15B" opacity=".25" />
    <path d="M12 2a7 7 0 0 1 7 7c0 4.5-7 13-7 13S5 13.5 5 9a7 7 0 0 1 7-7z" stroke="#E9C15B" strokeWidth="1.8" />
    <circle cx="12" cy="9" r="2.5" fill="#E9C15B" />
  </svg>
);
export const IconMap = ({ active = false }: { active?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M9 3L3 5v16l6-2 6 2 6-2V3l-6 2-6-2z" stroke={active ? "#111" : "rgba(255,255,255,.5)"} strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M9 3v16M15 5v16" stroke={active ? "#111" : "rgba(255,255,255,.5)"} strokeWidth="1.8"/>
  </svg>
);
export const IconPlan = ({ active = false }: { active?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={active ? "#111" : "rgba(255,255,255,.5)"} strokeWidth="1.8"/>
    <path d="M12 7v5l3 2" stroke={active ? "#111" : "rgba(255,255,255,.5)"} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
export const IconFind = ({ active = false }: { active?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke={active ? "#111" : "rgba(255,255,255,.5)"} strokeWidth="1.8"/>
    <path d="M16.5 16.5L21 21" stroke={active ? "#111" : "rgba(255,255,255,.5)"} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
export const IconCrew = ({ active = false }: { active?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="10" r="3.5" stroke={active ? "#111" : "rgba(255,255,255,.5)"} strokeWidth="1.8"/>
    <circle cx="16" cy="12" r="2.5" stroke={active ? "#111" : "rgba(255,255,255,.5)"} strokeWidth="1.8"/>
    <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5M15 19c0-2 1.7-3.5 4-3.5" stroke={active ? "#111" : "rgba(255,255,255,.5)"} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
