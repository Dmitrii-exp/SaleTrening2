import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function level(avg: number) {
  if (avg >= 85) return "Сложный";
  if (avg < 55) return "Лёгкий";
  return "Средний";
}

function textScore(value: unknown, focus: string) {
  const hay = String(value || "").toLowerCase();
  const f = focus.toLowerCase();
  if (!f) return 0;
  if (hay.includes(f)) return 8;
  if ((f.includes("discovery") || f.includes("потреб")) && /потреб|выяв|вопрос/.test(hay)) return 6;
  if ((f.includes("objection") || f.includes("возраж")) && /возраж|дорог|цен/.test(hay)) return 6;
  if ((f.includes("value") || f.includes("цен")) && /цен|стоим|выгод|польз/.test(hay)) return 6;
  if ((f.includes("closing") || f.includes("закры")) && /закры|сделк|следующ/.test(hay)) return 6;
  return 0;
}

function build(profile: any, scenarios: any[]) {
  const focus = String(profile?.recommended_focus || "discovery");
  const avg = Number(profile?.average_score || 0);
  const targetDifficulty = level(avg);

  const ranked = scenarios
    .map((scenario) => {
      let score = 0;
      score += textScore(`${scenario.title} ${scenario.objective} ${scenario.goal}`, focus);
      score += scenario.difficulty === targetDifficulty ? 5 : 0;
      score += scenario.client_role ? 1 : 0;
      return { scenario, score };
    })
    .sort((a, b) => b.score - a.score);

  return {
    difficulty: targetDifficulty,
    focus,
    days: ranked.slice(0, 5).map(({ scenario }, index) => ({
      day: index + 1,
      scenario,
      focus,
      reason: index === 0 ? "Главный слабый навык" : "Закрепление навыка",
    })),
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.company_id) return NextResponse.json({ error: "Company not found" }, { status: 403 });

    const [{ data: learning, error: learningError }, { data: scenarios, error: scenariosError }] = await Promise.all([
      supabase
        .from("employee_learning_profiles")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("employee_id", userId)
        .maybeSingle(),
      supabase
        .from("saletrening_scenarios")
        .select("id,title,description,difficulty,client_role,industry,objective,objections,active,created_at,client_mood,goal,required_questions,success_actions,failure_actions,evaluation_criteria,system_prompt,updated_at")
        .eq("active", true)
        .order("created_at", { ascending: false }),
    ]);

    if (learningError) return NextResponse.json({ error: learningError.message }, { status: 400 });
    if (scenariosError) return NextResponse.json({ error: scenariosError.message }, { status: 400 });

    return NextResponse.json({ plan: build(learning, scenarios || []) });
  } catch (error: unknown) {
    console.error("Training plan error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
