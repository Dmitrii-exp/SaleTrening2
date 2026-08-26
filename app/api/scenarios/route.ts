import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
  if (!profile?.company_id) return NextResponse.json({ error: "Company not found" }, { status: 403 });
  const { data, error } = await supabase.from("saletrening_scenarios").select("*").eq("active", true).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ scenarios: data ?? [] });
}
