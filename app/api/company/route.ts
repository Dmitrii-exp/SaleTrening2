import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MANAGER_ROLES = new Set(["manager", "director", "admin"]);

export async function GET() {
  const s = await createClient();
  const { data: claims } = await s.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile, error: profileError } = await s.from("profiles").select("company_id,role").eq("id", userId).maybeSingle();
  if (profileError) return NextResponse.json({ error: "Failed to load profile" }, { status: 400 });
  if (!profile?.company_id) return NextResponse.json({ error: "Company not found" }, { status: 403 });

  const { data: company, error } = await s.from("companies").select("id,name,industry,company_size,description,training_goal,onboarding_completed,created_at,updated_at").eq("id", profile.company_id).maybeSingle();
  if (error) return NextResponse.json({ error: "Failed to load company" }, { status: 400 });
  return NextResponse.json({ company, role: profile.role, canManage: MANAGER_ROLES.has(profile.role) });
}

export async function PATCH(req: Request) {
  const s = await createClient();
  const { data: claims } = await s.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await s.from("profiles").select("company_id,role").eq("id", userId).maybeSingle();
  if (!profile?.company_id || !MANAGER_ROLES.has(profile.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const payload = {
    name: String(body?.name || "").trim(),
    industry: String(body?.industry || "").trim() || null,
    company_size: String(body?.company_size || "").trim() || null,
    description: String(body?.description || "").trim() || null,
    training_goal: String(body?.training_goal || "").trim() || null,
    onboarding_completed: Boolean(body?.onboarding_completed),
    updated_at: new Date().toISOString(),
  };

  if (!payload.name) return NextResponse.json({ error: "Название компании обязательно" }, { status: 400 });

  const { data, error } = await s.from("companies").update(payload).eq("id", profile.company_id).select("id,name,industry,company_size,description,training_goal,onboarding_completed,updated_at").single();
  if (error) return NextResponse.json({ error: "Не удалось сохранить компанию" }, { status: 400 });
  return NextResponse.json({ company: data });
}
