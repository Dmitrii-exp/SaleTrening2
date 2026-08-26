import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MANAGER_ROLES = new Set(["manager", "director", "admin"]);

async function getContext() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { supabase, userId: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("id,company_id,role,first_name,last_name").eq("id", userId).maybeSingle();
  return { supabase, userId, profile };
}

export async function GET() {
  const { supabase, userId, profile } = await getContext();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!profile?.company_id) return NextResponse.json({ error: "Company not found" }, { status: 403 });

  const [{ data: members, error: membersError }, { data: company, error: companyError }, { data: invites, error: invitesError }] = await Promise.all([
    supabase.from("profiles").select("id,first_name,last_name,role,created_at,updated_at").eq("company_id", profile.company_id).order("created_at", { ascending: true }),
    supabase.from("companies").select("id,name,industry,company_size,description,training_goal,onboarding_completed").eq("id", profile.company_id).maybeSingle(),
    MANAGER_ROLES.has(profile.role)
      ? supabase.from("company_invitations").select("id,email,role,expires_at,accepted_at,created_at").eq("company_id", profile.company_id).order("created_at", { ascending: false }).limit(20)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (membersError || companyError || invitesError) {
    return NextResponse.json({ error: "Failed to load team" }, { status: 400 });
  }

  return NextResponse.json({ company, members: members || [], invitations: invites || [], canManage: MANAGER_ROLES.has(profile.role) });
}

export async function POST(req: Request) {
  const { supabase, userId, profile } = await getContext();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!profile?.company_id || !MANAGER_ROLES.has(profile.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();
  const role = String(body?.role || "employee").trim().toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Введите корректный email" }, { status: 400 });
  if (!["employee", "manager"].includes(role)) return NextResponse.json({ error: "Недопустимая роль" }, { status: 400 });

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invitation, error } = await supabase
    .from("company_invitations")
    .insert({ company_id: profile.company_id, email, role, token, invited_by: userId, expires_at: expiresAt })
    .select("id,email,role,token,expires_at")
    .single();

  if (error) return NextResponse.json({ error: "Не удалось создать приглашение" }, { status: 400 });

  return NextResponse.json({ invitation, inviteUrl: `/invite?token=${encodeURIComponent(token)}` });
}
