"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";

function InviteAccept() {
  const q = useSearchParams();
  const router = useRouter();
  const token = q.get("token") || "";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const accept = async () => {
    if (!token || busy) return;
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/invite/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Не удалось принять приглашение");
      router.push("/");
    } catch (e: any) { setMessage(e.message || "Ошибка"); } finally { setBusy(false); }
  };

  return <div className="card" style={{ maxWidth: 640, margin: "80px auto" }}><p className="eyebrow">ПРИГЛАШЕНИЕ</p><h1>Присоединение к SaleTrening</h1>{token ? <><p className="muted">После принятия аккаунт будет привязан к компании и вашей роли.</p><button className="btn" onClick={accept} disabled={busy}>{busy ? "Подключаю…" : "Принять приглашение"}</button></> : <p className="errorText">Ссылка приглашения неполная.</p>}{message && <p className="errorText">{message}</p>}</div>;
}

export default function InvitePage() { return <Suspense fallback={<div className="card"><h2>Загрузка…</h2></div>}><InviteAccept /></Suspense>; }
