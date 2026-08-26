import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeVoice } from "@/lib/training/voice-metrics";

export async function POST(req: Request) {
  try {
    const s = await createClient();
    const { data: c } = await s.auth.getClaims();
    const userId = c?.claims?.sub;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const b = await req.json().catch(() => ({}));
    const { data: p, error: profileError } = await s.from("profiles").select("company_id").eq("id", userId).maybeSingle();
    if (profileError) return NextResponse.json({ error: "Failed to load profile" }, { status: 400 });
    if (!p?.company_id) return NextResponse.json({ error: "Company not found" }, { status: 403 });

    const metrics = analyzeVoice(
      String(b.transcript || "").slice(0, 20000),
      Math.max(0, Number(b.durationMs || 0)),
      Array.isArray(b.pauseDurations) ? b.pauseDurations.map(Number).filter(Number.isFinite).slice(0, 200) : [],
      Math.max(0, Number(b.interruptionCount || 0)),
    );

    const pace = metrics.wordsPerMinute === 0 ? "Нет данных" : metrics.wordsPerMinute < 100 ? "Медленно" : metrics.wordsPerMinute > 170 ? "Быстро" : "Оптимальный темп";
    const paceScore = metrics.wordsPerMinute === 0 ? 0 : metrics.wordsPerMinute < 100 || metrics.wordsPerMinute > 170 ? 60 : 100;
    const fillerPenalty = Math.min(30, metrics.fillerCount * 3);
    const interruptionPenalty = Math.min(20, metrics.interruptionCount * 5);
    const pausePenalty = Math.min(20, metrics.pauseCount * 2);
    const voiceScore = Math.max(0, Math.min(100, Math.round(paceScore - fillerPenalty - interruptionPenalty - pausePenalty)));
    const recommendation = metrics.fillerCount >= 5 ? "Сократи слова-паразиты и делай короткие паузы вместо заполнителей." : metrics.wordsPerMinute > 170 ? "Замедли темп и делай паузы перед важными аргументами." : metrics.wordsPerMinute > 0 && metrics.wordsPerMinute < 100 ? "Добавь динамики речи, сохраняя ясность формулировок." : "Темп и структура речи выглядят сбалансированно.";

    if (b.sessionId) {
      await s.from("realtime_training_sessions").update({ engine_state: { ...(b.engineState || {}), voice_metrics: metrics, voice_score: voiceScore } }).eq("id", b.sessionId).eq("employee_id", userId).eq("company_id", p.company_id);
    }

    return NextResponse.json({ metrics, feedback: { pace, fillers: metrics.fillerCount, pauses: metrics.pauseCount, interruptions: metrics.interruptionCount, score: voiceScore, recommendation } });
  } catch (error: unknown) {
    console.error("Voice metrics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
