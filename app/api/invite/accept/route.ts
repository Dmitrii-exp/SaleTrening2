import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const s = await createClient();
    const { data: claims } = await s.auth.getClaims();
    if (!claims?.claims?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || "").trim();
    if (!token) return NextResponse.json({ error: "Invitation token is required" }, { status: 400 });

    const { data, error } = await s.rpc("accept_company_invitation", { p_token: token });
    if (error) {
      const message = String(error.message || "");
      if (message.includes("invitation_not_found")) return NextResponse.json({ error: "Приглашение не найдено" }, { status: 404 });
      if (message.includes("invitation_already_accepted")) return NextResponse.json({ error: "Приглашение уже принято" }, { status: 409 });
      if (message.includes("invitation_expired")) return NextResponse.json({ error: "Приглашение истекло" }, { status: 410 });
      if (message.includes("email_mismatch")) return NextResponse.json({ error: "Email аккаунта не совпадает с приглашением" }, { status: 403 });
      if (message.includes("profile_not_found")) return NextResponse.json({ error: "Профиль пользователя не найден" }, { status: 400 });
      console.error("Invitation acceptance RPC failed", message);
      return NextResponse.json({ error: "Не удалось принять приглашение" }, { status: 400 });
    }

    return NextResponse.json(data || { ok: true });
  } catch (error: unknown) {
    console.error("Invitation acceptance error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
