"use client";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";
import { IconMap, IconPlan, IconFind, IconCrew } from "./icons";
import type { Screen } from "@/lib/types";

const TABS: { key: Screen; label: keyof ReturnType<typeof t>["tabs"]; Icon: typeof IconMap }[] = [
  { key: "map", label: "map", Icon: IconMap },
  { key: "planner", label: "plan", Icon: IconPlan },
  { key: "search", label: "find", Icon: IconFind },
  { key: "friends", label: "crew", Icon: IconCrew },
];

export default function TabBar() {
  const { screen, go, lang } = useApp();
  const txt = t(lang);
  return (
    <div
      className="fixed z-30 flex items-center gap-[2px] rounded-[28px] border p-2 shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
      style={{
        bottom: "max(18px, env(safe-area-inset-bottom))",
        left: "18px",
        right: "18px",
        background: "rgba(10,10,10,.96)",
        backdropFilter: "blur(20px)",
        borderColor: "rgba(255,255,255,.09)",
      }}
    >
      {TABS.map((tab) => {
        const active = screen === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => go(tab.key)}
            className="h-11 rounded-[22px] flex items-center justify-center gap-[7px] overflow-hidden whitespace-nowrap"
            style={{
              flex: active ? 3 : 1,
              minWidth: 44,
              background: active ? "#E9C15B" : "transparent",
              transition: "flex .25s cubic-bezier(.4,0,.2,1),background .15s",
              border: 0,
              cursor: "pointer",
            }}
          >
            <tab.Icon active={active} />
            {active && (
              <span style={{ fontSize: 14, fontWeight: 800, color: "#111", letterSpacing: ".01em" }}>
                {txt.tabs[tab.label]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
