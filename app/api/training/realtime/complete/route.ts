import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateTrainingScore } from "@/lib/training/scenario-engine";
import { normalizeScenario } from "@/lib/training/scenario-types";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body?.scenarioId || !Array.isArray(body?.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "scenarioId and messages are required" }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
    if (profileError) return NextResponse.json({ error: "Failed to load profile" }, { status: 400 });
    if (!profile?.company_id) return NextResponse.json({ error: "Company not found" }, { status: 403 });

    const { data: scenarioRow, error: scenarioError } = await supabase.from("saletrening_scenarios").select("*").eq("id", body.scenarioId).eq("active", true).maybeSingle();
    if (scenarioError) return NextResponse.json({ error: "Failed to load scenario" }, { status: 400 });
    if (!scenarioRow) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });

    const scenario = normalizeScenario(scenarioRow);
    const state = body.state || {};
    const finalScore = calculateTrainingScore(state, body.messages, scenario);
    const now = new Date().toISOString();

    const { data, error } = await supabase.from("realtime_training_sessions").insert({
      company_id: profile.company_id,
      employee_id: userId,
      scenario_id: scenarioRow.id,
      messages: body.messages,
      engine_state: state,
      score: finalScore,
      duration_seconds: Math.max(0, Number(body.durationSeconds || 0)),
      ai_feedback: `Итоговый результат: ${finalScore}%.`,
      completed_at: now,
    }).select("id,score,created_at").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const learningResponse = await fetch(new URL("/api/training/learning-profile", req.url), {
      method: "POST",
      headers: { "content-type": "application/json", ...(req.headers.get("cookie") ? { cookie: req.headers.get("cookie")! } : {}) },
      body: JSON.stringify({ score: data.score, stageScores: state.stageScores || {} }),
    });
    if (!learningResponse.ok) console.warn("Learning profile update failed after training completion");

    const assignmentQuery = supabase.from("training_assignments").select("id").eq("company_id", profile.company_id).eq("employee_id", userId).eq("scenario_id", scenarioRow.id).in("status", ["pending", "in_progress"]).order("created_at", { ascending: true }).limit(1);
    const { data: assignment } = await assignmentQuery.maybeSingle();
    if (assignment) {
      await supabase.from("training_assignments").update({ status: "completed", completed_at: now, result_id: data.id, updated_at: now }).eq("id", assignment.id);
    }

    return NextResponse.json({ sessionId: data.id, score: data.score, scenarioTitle: scenario.title, assignmentCompleted: Boolean(assignment), feedbackUrl: `/training/realtime/feedback?sessionId=${data.id}` });
  } catch (error: unknown) {
    console.error("Realtime completion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
