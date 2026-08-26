import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();

    if (claimsError) {
      console.error("Realtime feedback auth error:", claimsError);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }

    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId required" },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Realtime feedback profile error:", profileError);
      return NextResponse.json(
        { error: "Failed to load profile" },
        { status: 500 }
      );
    }

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 403 }
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from("realtime_training_sessions")
      .select(
        "id, scenario_id, score, engine_state, created_at, duration_seconds"
      )
      .eq("id", sessionId)
      .eq("company_id", profile.company_id)
      .maybeSingle();

    if (sessionError) {
      console.error("Realtime feedback session error:", sessionError);
      return NextResponse.json(
        { error: "Failed to load session" },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const { data: feedback, error: feedbackError } = await supabase
      .from("realtime_training_feedback")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (feedbackError) {
      console.error("Realtime feedback load error:", feedbackError);
      return NextResponse.json(
        { error: "Failed to load feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session,
      feedback: feedback ?? null,
    });
  } catch (error: unknown) {
    console.error("Realtime feedback GET error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
