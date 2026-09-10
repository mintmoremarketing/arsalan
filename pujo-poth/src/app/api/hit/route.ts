import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, reason: "no_supabase" });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  const now = new Date().toISOString();

  const sb = createClient(url, key);
  const { data: existing } = await sb
    .from("sessions")
    .select("id,hits")
    .eq("ip", ip)
    .eq("ua", ua)
    .maybeSingle();

  if (existing) {
    await sb
      .from("sessions")
      .update({ last_seen: now, hits: (existing.hits ?? 0) + 1 })
      .eq("id", existing.id);
  } else {
    await sb.from("sessions").insert({ ip, ua, first_seen: now, last_seen: now, hits: 1 });
  }
  return NextResponse.json({ ok: true });
}
