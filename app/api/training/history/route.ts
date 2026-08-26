import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });
    if (!profile?.company_id) return NextResponse.json({ error: "Company not found" }, { status: 403 });

    const { data: sessions, error: sessionsError } = await supabase
      .from("realtime_training_sessions")
      .select("id,scenario_id,employee_id,score,duration_seconds,created_at,completed_at,engine_state,ai_feedback")
      .eq("company_id", profile.company_id)
      .eq("employee_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (sessionsError) return NextResponse.json({ error: sessionsError.message }, { status: 400 });

    const scenarioIds = [...new Set((sessions || []).map((item) => item.scenario_id))];
    const { data: scenarios, error: scenariosError } = scenarioIds.length
      ? await supabase.from("saletrening_scenarios").select("id,title,difficulty,client_role,industry,objective").in("id", scenarioIds)
      : { data: [], error: null };

    if (scenariosError) return NextResponse.json({ error: scenariosError.message }, { status: 400 });

    const scenarioMap = new Map((scenarios || []).map((scenario) => [scenario.id, scenario]));
    const feedbackIds = (sessions || []).map((item) => item.id);
    const { data: feedback, error: feedbackError } = feedbackIds.length
      ? await supabase.from("realtime_training_feedback").select("session_id,summary,next_training_focus,stage_scores").in("session_id", feedbackIds)
      : { data: [], error: null };

    if (feedbackError) return NextResponse.json({ error: feedbackError.message }, { status: 400 });

    const feedbackMap = new Map((feedback || []).map((item) => [item.session_id, item]));
    const history = (sessions || []).map((session) => ({
      ...session,
      scenario: scenarioMap.get(session.scenario_id) || null,
      feedback: feedbackMap.get(session.id) || null,
    }));

    return NextResponse.json({ history });
  } catch (error: unknown) {
    console.error("Training history error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
