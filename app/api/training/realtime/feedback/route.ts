import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getGigaChatToken(): Promise<string> {
  const authKey = process.env.GIGACHAT_AUTH_KEY;

  if (!authKey) {
    throw new Error("GIGACHAT_AUTH_KEY is not configured");
  }

  const response = await fetch(
    "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authKey}`,
        RqUID: crypto.randomUUID(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "scope=GIGACHAT_API_PERS",
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("GigaChat OAuth failed");
  }

  const data = (await response.json()) as {
    access_token?: string;
  };

  if (!data.access_token) {
    throw new Error("GigaChat OAuth token was not returned");
  }

  return data.access_token;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const { data: claimsData } = await supabase.auth.getClaims();

    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    if (!body?.sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 403 }
      );
    }

    const { data: session } = await supabase
      .from("realtime_training_sessions")
      .select("*")
      .eq("id", body.sessionId)
      .eq("company_id", profile.company_id)
      .maybeSingle();

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const accessToken = await getGigaChatToken();

    const prompt = `
Проанализируй тренировку менеджера по продажам.

Не выдумывай факты.

Верни только JSON следующего формата:

{
  "summary": "",
  "strengths": [],
  "mistakes": [],
  "missed_questions": [],
  "objection_handling": "",
  "stage_scores": {
    "opening": 0,
    "discovery": 0,
    "objection": 0,
    "value": 0,
    "closing": 0
  },
  "recommendations": [],
  "next_training_focus": ""
}

Оцени только навыки продаж.

Диалог:
${JSON.stringify(session.messages)}

Финальное состояние:
${JSON.stringify(session.engine_state)}

Итоговый балл:
${session.score}
`;

    const gigaChatResponse = await fetch(
      "https://api.giga.chat/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.GIGACHAT_MODEL || "GigaChat",
          messages: [
            {
              role: "system",
              content: "Ты опытный AI-тренер по продажам.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 1800,
        }),
        cache: "no-store",
      }
    );

    if (!gigaChatResponse.ok) {
      return NextResponse.json(
        { error: "GigaChat request failed" },
        { status: 502 }
      );
    }

    const gigaChatData = (await gigaChatResponse.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const rawContent =
      gigaChatData.choices?.[0]?.message?.content || "{}";

    const raw = rawContent
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let feedback: {
      summary: string;
      strengths: unknown[];
      mistakes: unknown[];
      missed_questions: unknown[];
      objection_handling: string;
      stage_scores: Record<string, unknown>;
      recommendations: unknown[];
      next_training_focus: string;
    };

    try {
      feedback = JSON.parse(raw);
    } catch {
      feedback = {
        summary: raw,
        strengths: [],
        mistakes: [],
        missed_questions: [],
        objection_handling: "",
        stage_scores: {},
        recommendations: [],
        next_training_focus: "",
      };
    }

    /*
     * В некоторых версиях/типах Supabase PostgREST
     * TypeScript неправильно выводит тип результата upsert().
     *
     * Поэтому здесь сначала получаем весь результат,
     * а затем безопасно приводим его к ожидаемой структуре.
     */
    const feedbackResult = await supabase
      .from("realtime_training_feedback")
      .upsert(
        {
          session_id: session.id,
          company_id: profile.company_id,
          employee_id: userId,
          summary: feedback.summary || "",
          strengths: feedback.strengths || [],
          mistakes: feedback.mistakes || [],
          missed_questions: feedback.missed_questions || [],
          objection_handling: feedback.objection_handling || "",
          stage_scores: feedback.stage_scores || {},
          recommendations: feedback.recommendations || [],
          next_training_focus: feedback.next_training_focus || "",
        },
        {
          onConflict: "session_id",
        }
      )
      .select("id")
      .single();

    /*
     * Явно проверяем результат через data.
     * Это устраняет TS2339, который сейчас появляется
     * при обращении к response.error в твоей версии типов Supabase.
     */
    const feedbackRow = feedbackResult.data;

    if (!feedbackRow) {
      return NextResponse.json(
        {
          error: "Failed to save training feedback",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      feedbackId: feedbackRow.id,
      feedback,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Feedback error";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
