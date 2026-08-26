import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const s = await createClient();
  const { data: claims } = await s.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await s.from("profiles").select("company_id,role").eq("id", userId).maybeSingle();
  if (!profile?.company_id) return NextResponse.json({ error: "Company not found" }, { status: 403 });

  const [{ data: subscription, error: subError }, { data: plans, error: plansError }] = await Promise.all([
    s.from("company_subscriptions").select("company_id,plan_id,status,started_at,trial_ends_at,current_period_end,training_used,updated_at").eq("company_id", profile.company_id).maybeSingle(),
    s.from("billing_plans").select("id,name,price_monthly,training_limit,employee_limit,trial_days,features").eq("active", true).order("price_monthly"),
  ]);
  if (subError || plansError) return NextResponse.json({ error: "Failed to load billing" }, { status: 400 });

  const plan = plans?.find((x) => x.id === subscription?.plan_id) || null;
  return NextResponse.json({ subscription, plan, plans: plans || [], role: profile.role, canManage: ["director", "admin"].includes(profile.role) });
}

export async function POST(req: Request) {
  const s = await createClient();
  const { data: claims } = await s.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await s.from("profiles").select("company_id,role").eq("id", userId).maybeSingle();
  if (!profile?.company_id || !["director", "admin"].includes(profile.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const planId = String(body?.planId || "");
  const { data: plan } = await s.from("billing_plans").select("id,trial_days").eq("id", planId).eq("active", true).maybeSingle();
  if (!plan) return NextResponse.json({ error: "Тариф не найден" }, { status: 404 });
  const now = new Date();
  const periodEnd = new Date(now); periodEnd.setMonth(periodEnd.getMonth() + 1);
  const trialEnd = plan.trial_days ? new Date(now.getTime() + plan.trial_days * 86400000).toISOString() : null;
  const status = plan.trial_days ? "trial" : "active";

  const { data, error } = await s.from("company_subscriptions").upsert({ company_id: profile.company_id, plan_id: plan.id, status, started_at: now.toISOString(), trial_ends_at: trialEnd, current_period_end: periodEnd.toISOString(), training_used: 0, updated_at: now.toISOString() }, { onConflict: "company_id" }).select("*").single();
  if (error) return NextResponse.json({ error: "Не удалось изменить тариф" }, { status: 400 });
  return NextResponse.json({ subscription: data });
}
