import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const s = await createClient();
  const { data: claims } = await s.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const token = String(body?.token || "").trim();
  if (!token) return NextResponse.json({ error: "Invitation token is required" }, { status: 400 });

  const { data: invitation, error: inviteError } = await s
    .from("company_invitations")
    .select("id,company_id,email,role,token,expires_at,accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteError) return NextResponse.json({ error: "Failed to load invitation" }, { status: 400 });
  if (!invitation) return NextResponse.json({ error: "Приглашение не найдено" }, { status: 404 });
  if (invitation.accepted_at) return NextResponse.json({ error: "Приглашение уже принято" }, { status: 409 });
  if (new Date(invitation.expires_at) < new Date()) return NextResponse.json({ error: "Приглашение истекло" }, { status: 410 });

  const { data: authUser } = await s.auth.getUser();
  const currentEmail = authUser.user?.email?.toLowerCase();
  if (currentEmail && currentEmail !== invitation.email.toLowerCase()) {
    return NextResponse.json({ error: "Email аккаунта не совпадает с приглашением" }, { status: 403 });
  }

  const { error: profileError } = await s.from("profiles").update({ company_id: invitation.company_id, role: invitation.role, updated_at: new Date().toISOString() }).eq("id", userId);
  if (profileError) return NextResponse.json({ error: "Не удалось привязать аккаунт к компании" }, { status: 400 });

  await s.from("organization_members").upsert({ company_id: invitation.company_id, user_id: userId, role: invitation.role, status: "active", joined_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "company_id,user_id" });
  const { error: acceptError } = await s.from("company_invitations").update({ accepted_at: new Date().toISOString() }).eq("id", invitation.id);
  if (acceptError) return NextResponse.json({ error: "Не удалось завершить приглашение" }, { status: 400 });

  return NextResponse.json({ ok: true, companyId: invitation.company_id, role: invitation.role });
}
