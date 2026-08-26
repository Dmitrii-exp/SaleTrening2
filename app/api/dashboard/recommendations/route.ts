import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const s = await createClient();

  const { data: c } = await s.auth.getClaims();

  if (!c?.claims?.sub) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data: p } = await s
    .from("profiles")
    .select("company_id,role")
    .eq("id", c.claims.sub)
    .maybeSingle();

  if (
    !p?.company_id ||
    !["manager", "director", "admin"].includes(p.role)
  ) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const { data: profiles } = await s
    .from("employee_learning_profiles")
    .select("*")
    .eq("company_id", p.company_id);

  const rec = (profiles || [])
    .map((x: any) => {
      const skills = Object.entries(
        x.skill_scores || {}
      ).sort(
        (a: any, b: any) =>
          Number(a[1]) - Number(b[1])
      );

      const weak =
        skills[0]?.[0] ||
        x.recommended_focus ||
        "discovery";

      const avg = Number(
        x.average_score || 0
      );

      let action =
        "Продолжить регулярные тренировки";

      if (avg < 55) {
        action =
          "Назначить базовую тренировку и разобрать ошибки";
      } else if (avg < 70) {
        action =
          "Дать дополнительную практику слабого навыка";
      } else if (avg >= 85) {
        action =
          "Повысить сложность сценариев";
      }

      return {
        employeeId: x.employee_id,
        score: avg,
        focus: weak,
        action,
        priority:
          avg < 55
            ? "high"
            : avg < 70
              ? "medium"
              : "low",
      };
    })
    .sort((a: any, b: any) => {
      const priorityOrder: Record<
        "high" | "medium" | "low",
        number
      > = {
        high: 0,
        medium: 1,
        low: 2,
      };

      return (
        priorityOrder[
          a.priority as "high" | "medium" | "low"
        ] -
        priorityOrder[
          b.priority as "high" | "medium" | "low"
        ]
      );
    });

  return NextResponse.json({
    recommendations: rec,
  });
}
