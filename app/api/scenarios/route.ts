import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = new Set(["director", "admin"]);
const FIELDS = "id,title,description,difficulty,client_role,industry,objective,objections,active,created_at,client_mood,goal,required_questions,success_actions,failure_actions,evaluation_criteria,system_prompt,updated_at";

async function context() {
  const s = await createClient();
  const { data: claims } = await s.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { s, userId: null, profile: null };
  const { data: profile } = await s.from("profiles").select("id,company_id,role").eq("id", userId).maybeSingle();
  return { s, userId, profile };
}

export async function GET() {
  const { s, userId, profile } = await context();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!profile?.company_id) return NextResponse.json({ error: "Company not found" }, { status: 403 });
  const { data, error } = await s.from("saletrening_scenarios").select(FIELDS).eq("active", true).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Failed to load scenarios" }, { status: 400 });
  return NextResponse.json({ scenarios: data ?? [] });
}

export async function POST(req: Request) {
  const { s, userId, profile } = await context();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!profile?.company_id || !ADMIN_ROLES.has(profile.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const title = String(b?.title || "").trim();
  const objective = String(b?.objective || "").trim();
  if (!title || !objective) return NextResponse.json({ error: "Название и цель обязательны" }, { status: 400 });

  const difficulty = ["Лёгкий", "Средний", "Сложный", "Высокая", "easy", "medium", "hard"].includes(String(b?.difficulty)) ? String(b.difficulty) : "Средний";
  const { data, error } = await s.from("saletrening_scenarios").insert({
    title,
    description: String(b?.description || "").trim() || objective,
    difficulty,
    client_role: String(b?.client_role || "ЛПР").trim(),
    industry: String(b?.industry || "B2B").trim(),
    objective,
    objections: Array.isArray(b?.objections) ? b.objections.map(String) : [],
    active: true,
    client_mood: String(b?.client_mood || "Нейтральный").trim(),
    goal: String(b?.goal || objective).trim(),
    required_questions: Array.isArray(b?.required_questions) ? b.required_questions.map(String) : [],
    success_actions: Array.isArray(b?.success_actions) ? b.success_actions.map(String) : [],
    failure_actions: Array.isArray(b?.failure_actions) ? b.failure_actions.map(String) : [],
    evaluation_criteria: b?.evaluation_criteria && typeof b.evaluation_criteria === "object" ? b.evaluation_criteria : {},
    system_prompt: String(b?.system_prompt || "").trim() || null,
  }).select(FIELDS).single();
  if (error) return NextResponse.json({ error: "Не удалось создать сценарий" }, { status: 400 });
  return NextResponse.json({ scenario: data });
}

export async function PATCH(req: Request) {
  const { s, userId, profile } = await context();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!profile?.company_id || !ADMIN_ROLES.has(profile.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const id = Number(b?.id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Некорректный id сценария" }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ["title", "description", "difficulty", "client_role", "industry", "objective", "client_mood", "goal", "system_prompt", "active"]) {
    if (key in b) patch[key] = key === "active" ? Boolean(b[key]) : String(b[key] || "").trim();
  }
  for (const key of ["objections", "required_questions", "success_actions", "failure_actions"]) {
    if (key in b) patch[key] = Array.isArray(b[key]) ? b[key].map(String) : [];
  }
  if ("evaluation_criteria" in b) patch.evaluation_criteria = b.evaluation_criteria && typeof b.evaluation_criteria === "object" ? b.evaluation_criteria : {};

  const { data, error } = await s.from("saletrening_scenarios").update(patch).eq("id", id).select(FIELDS).single();
  if (error) return NextResponse.json({ error: "Не удалось обновить сценарий" }, { status: 400 });
  return NextResponse.json({ scenario: data });
}
