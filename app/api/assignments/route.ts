import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MANAGER_ROLES = ["manager", "director", "admin"] as const;
const PRIORITIES = ["low", "normal", "high"] as const;
const STATUSES = ["assigned", "in_progress", "completed", "overdue"] as const;

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

    const isManager = MANAGER_ROLES.includes(profile.role as (typeof MANAGER_ROLES)[number]);
    const query = supabase
      .from("training_assignments")
      .select("id,employee_id,scenario_id,title,description,priority,status,due_at,assigned_by,completed_at,result_id,created_at,updated_at")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })
      .limit(100);

    const { data, error } = isManager ? await query : await query.eq("employee_id", userId);
    if (error) return NextResponse.json({ error: "Failed to load assignments" }, { status: 400 });

    const scenarioIds = [...new Set((data || []).map((item) => item.scenario_id).filter(Boolean))];
    const { data: scenarios, error: scenarioError } = scenarioIds.length
      ? await supabase.from("saletrening_scenarios").select("id,title,difficulty").in("id", scenarioIds)
      : { data: [], error: null };
    if (scenarioError) return NextResponse.json({ error: "Failed to load scenarios" }, { status: 400 });
    const scenarioMap = new Map((scenarios || []).map((scenario) => [scenario.id, scenario]));

    return NextResponse.json({
      assignments: (data || []).map((item) => ({ ...item, scenario: scenarioMap.get(item.scenario_id) || null })),
      canManage: isManager,
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
    if (!MANAGER_ROLES.includes(profile.role as (typeof MANAGER_ROLES)[number])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const employeeId = String(body?.employeeId || "").trim();
    const title = String(body?.title || "").trim();
    if (!employeeId || !title) return NextResponse.json({ error: "employeeId and title are required" }, { status: 400 });

    const priority = PRIORITIES.includes(body?.priority) ? body.priority : "normal";
    const status = body?.status === "in_progress" ? "in_progress" : "assigned";
    const { data: employee, error: employeeError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", employeeId)
      .eq("company_id", profile.company_id)
      .maybeSingle();
    if (employeeError) return NextResponse.json({ error: "Failed to find employee" }, { status: 400 });
    if (!employee) return NextResponse.json({ error: "Employee not found in company" }, { status: 404 });

    const scenarioId = body?.scenarioId ? Number(body.scenarioId) : null;
    if (scenarioId !== null && (!Number.isInteger(scenarioId) || scenarioId <= 0)) {
      return NextResponse.json({ error: "Некорректный сценарий" }, { status: 400 });
    }
    if (scenarioId !== null) {
      const { data: scenario, error: scenarioError } = await supabase
        .from("saletrening_scenarios")
        .select("id")
        .eq("id", scenarioId)
        .eq("active", true)
        .maybeSingle();
      if (scenarioError) return NextResponse.json({ error: "Failed to validate scenario" }, { status: 400 });
      if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("training_assignments")
      .insert({
        company_id: profile.company_id,
        employee_id: employeeId,
        scenario_id: scenarioId,
        title,
        description: String(body?.description || "").trim(),
        priority,
        status,
        due_at: body?.dueAt || null,
        assigned_by: userId,
      })
      .select("id,employee_id,scenario_id,title,description,priority,status,due_at,created_at")
      .single();

    if (error) return NextResponse.json({ error: "Не удалось создать назначение" }, { status: 400 });

    const { error: notificationError } = await supabase.from("user_notifications").insert({
      user_id: employeeId,
      company_id: profile.company_id,
      type: "assignment",
      title: "Новая тренировка назначена",
      body: title,
      href: "/assignments",
    });
    if (notificationError) console.warn("Assignment notification failed", notificationError.message);

    return NextResponse.json({ assignment: data }, { status: 201 });
  } catch (error: unknown) {
    console.error("Assignments POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { supabase, userId, profile } = await getContext();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!profile?.company_id) return NextResponse.json({ error: "Company not found" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    const nextStatus = String(body?.status || "").trim();
    if (!id || !STATUSES.includes(nextStatus as (typeof STATUSES)[number])) return NextResponse.json({ error: "Некорректное назначение или статус" }, { status: 400 });

    const manager = MANAGER_ROLES.includes(profile.role as (typeof MANAGER_ROLES)[number]);
    const updates = {
      status: nextStatus,
      completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    let query = supabase.from("training_assignments").update(updates).eq("id", id).eq("company_id", profile.company_id);
    if (!manager) query = query.eq("employee_id", userId);

    const { data: assignment, error } = await query.select("id,employee_id,status,completed_at,result_id").single();
    if (error) return NextResponse.json({ error: "Не удалось обновить назначение" }, { status: 400 });
    return NextResponse.json({ assignment });
  } catch (error: unknown) {
    console.error("Assignments PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
