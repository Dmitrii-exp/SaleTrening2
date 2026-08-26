import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getContext() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { supabase, userId: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id,role")
    .eq("id", userId)
    .maybeSingle();

  return { supabase, userId, profile };
}

export async function GET() {
  try {
    const { supabase, userId, profile } = await getContext();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!profile?.company_id) return NextResponse.json({ error: "Company not found" }, { status: 403 });

    const { data, error } = await supabase
      .from("training_assignments")
      .select("id,employee_id,scenario_id,title,description,priority,status,due_at,assigned_by,completed_at,created_at,updated_at")
      .eq("company_id", profile.company_id)
      .or(`employee_id.eq.${userId},assigned_by.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const scenarioIds = [...new Set((data || []).map((item) => item.scenario_id).filter(Boolean))];
    const { data: scenarios, error: scenarioError } = scenarioIds.length
      ? await supabase.from("saletrening_scenarios").select("id,title,difficulty").in("id", scenarioIds)
      : { data: [], error: null };

    if (scenarioError) return NextResponse.json({ error: scenarioError.message }, { status: 400 });
    const scenarioMap = new Map((scenarios || []).map((scenario) => [scenario.id, scenario]));

    return NextResponse.json({
      assignments: (data || []).map((item) => ({ ...item, scenario: scenarioMap.get(item.scenario_id) || null })),
      canManage: ["manager", "director", "admin"].includes(profile.role),
    });
  } catch (error: unknown) {
    console.error("Assignments GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { supabase, userId, profile } = await getContext();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!profile?.company_id) return NextResponse.json({ error: "Company not found" }, { status: 403 });
    if (!["manager", "director", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    if (!body?.employeeId || !body?.title) {
      return NextResponse.json({ error: "employeeId and title are required" }, { status: 400 });
    }

    const employeeId = String(body.employeeId);
    const priority = ["high", "medium", "low"].includes(body.priority) ? body.priority : "medium";
    const status = ["pending", "in_progress"].includes(body.status) ? body.status : "pending";

    const { data: employee, error: employeeError } = await supabase
      .from("profiles")
      .select("id,company_id")
      .eq("id", employeeId)
      .eq("company_id", profile.company_id)
      .maybeSingle();

    if (employeeError) return NextResponse.json({ error: employeeError.message }, { status: 400 });
    if (!employee) return NextResponse.json({ error: "Employee not found in company" }, { status: 404 });

    if (body.scenarioId) {
      const { data: scenario, error: scenarioError } = await supabase
        .from("saletrening_scenarios")
        .select("id")
        .eq("id", body.scenarioId)
        .eq("active", true)
        .maybeSingle();
      if (scenarioError) return NextResponse.json({ error: scenarioError.message }, { status: 400 });
      if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("training_assignments")
      .insert({
        company_id: profile.company_id,
        employee_id: employeeId,
        scenario_id: body.scenarioId || null,
        title: String(body.title).trim(),
        description: String(body.description || "").trim(),
        priority,
        status,
        due_at: body.dueAt || null,
        assigned_by: userId,
      })
      .select("id,employee_id,scenario_id,title,description,priority,status,due_at,created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabase.from("user_notifications").insert({
      user_id: employeeId,
      company_id: profile.company_id,
      type: "training_assignment",
      title: "Новая тренировка назначена",
      body: String(body.title).trim(),
      href: "/assignments",
    }).then(({ error: notificationError }) => {
      if (notificationError) console.warn("Assignment notification failed", notificationError.message);
    });

    return NextResponse.json({ assignment: data }, { status: 201 });
  } catch (error: unknown) {
    console.error("Assignments POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
