import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function pick(feedback: any, scenarios: any[]) {
  const focus = String(feedback?.next_training_focus || "").toLowerCase();
  const mistakes = [...(feedback?.mistakes || []), ...(feedback?.missed_questions || [])]
    .join(" ")
    .toLowerCase();
  const text = `${focus} ${mistakes}`;

  return (
    scenarios
      .map((scenario) => {
        const hay = `${scenario.title} ${scenario.goal || ""} ${scenario.objective || ""} ${(scenario.objections || []).join(" ")}`.toLowerCase();
        let score = 0;
        if (/возраж|дорог|сравн/.test(text) && /возраж|дорог|цен|сравн/.test(hay)) score += 6;
        if (/вопрос|потреб|выяв/.test(text) && /потреб|выяв|вопрос/.test(hay)) score += 6;
        if (/цен|стоим|скид/.test(text) && /цен|стоим|выгод|скид/.test(hay)) score += 5;
        if (/закры|следующ/.test(text) && /закры|оформ|сделк|следующ/.test(hay)) score += 5;
        if (scenario.difficulty === "Сложный" || scenario.difficulty === "Высокая") score += 1;
        return { scenario, score };
      })
      .sort((a, b) => b.score - a.score)[0]?.scenario || scenarios[0]
  );
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessionId = new URL(req.url).searchParams.get("sessionId");
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.company_id) return NextResponse.json({ error: "Company not found" }, { status: 403 });

    const { data: session, error: sessionError } = await supabase
      .from("realtime_training_sessions")
      .select("id,company_id,employee_id")
      .eq("id", sessionId)
      .eq("company_id", profile.company_id)
      .maybeSingle();

    if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 400 });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.employee_id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [{ data: feedback, error: feedbackError }, { data: scenarios, error: scenariosError }] = await Promise.all([
      supabase.from("realtime_training_feedback").select("*").eq("session_id", sessionId).maybeSingle(),
      supabase.from("saletrening_scenarios").select("*").eq("active", true).order("created_at", { ascending: false }),
    ]);

    if (feedbackError) return NextResponse.json({ error: feedbackError.message }, { status: 400 });
    if (scenariosError) return NextResponse.json({ error: scenariosError.message }, { status: 400 });
    if (!feedback || !scenarios?.length) return NextResponse.json({ scenario: null });

    const scenario = pick(feedback, scenarios);
    return NextResponse.json({
      scenario,
      reason: feedback.next_training_focus || "Продолжить развитие навыка",
    });
  } catch (error: unknown) {
    console.error("Next training error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
