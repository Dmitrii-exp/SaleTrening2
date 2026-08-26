import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function score(state: any, messages: any[]) {
  let result = 50;
  if (Number(state?.trust || 0) > 55) result += 15;
  if (Number(state?.resistance || 100) < 45) result += 10;
  if (Number(state?.buyProbability || 0) > 60) result += 15;

  const manager = messages.filter((message: any) => message?.role === "manager");
  const questions = manager.filter((message: any) =>
    /[?]|как|что|почему|какой|расскаж/.test(String(message?.content || "").toLowerCase())
  ).length;

  result += Math.min(10, questions * 2);
  return Math.max(0, Math.min(100, Math.round(result)));
}

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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });
    if (!profile?.company_id) return NextResponse.json({ error: "Company not found" }, { status: 403 });

    const { data: scenario, error: scenarioError } = await supabase
      .from("saletrening_scenarios")
      .select("id,title")
      .eq("id", body.scenarioId)
      .eq("active", true)
      .maybeSingle();

    if (scenarioError) return NextResponse.json({ error: scenarioError.message }, { status: 400 });
    if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });

    const finalScore = score(body.state, body.messages);
    const { data, error } = await supabase
      .from("realtime_training_sessions")
      .insert({
        company_id: profile.company_id,
        employee_id: userId,
        scenario_id: scenario.id,
        messages: body.messages,
        engine_state: body.state || {},
        score: finalScore,
        duration_seconds: Math.max(0, Number(body.durationSeconds || 0)),
        ai_feedback: `Итоговый результат: ${finalScore}%.`,
        completed_at: new Date().toISOString(),
      })
      .select("id,score,created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const learningResponse = await fetch(new URL("/api/training/learning-profile", req.url), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(req.headers.get("cookie") ? { cookie: req.headers.get("cookie")! } : {}),
      },
      body: JSON.stringify({
        score: data.score,
        stageScores: body.state?.stageScores || {},
      }),
    });

    if (!learningResponse.ok) console.warn("Learning profile update failed after training completion");

    return NextResponse.json({
      sessionId: data.id,
      score: data.score,
      feedbackUrl: `/training/realtime/feedback?sessionId=${data.id}`,
    });
  } catch (error: unknown) {
    console.error("Realtime completion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
