"use client";
import { useEffect, useMemo, useState } from "react";

export default function TeamPage() {
  const [data, setData] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");

  const load = () => fetch("/api/team").then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Ошибка"); return d; }).then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const activeCount = useMemo(() => data?.members?.length || 0, [data]);

  const invite = async () => {
    if (!email.trim() || busy) return;
    setBusy(true); setError(""); setInviteUrl("");
    try {
      const r = await fetch("/api/team", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, role }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Не удалось пригласить");
      setInviteUrl(d.inviteUrl); setEmail(""); await load();
    } catch (e: any) { setError(e.message || "Ошибка"); } finally { setBusy(false); }
  };

  if (!data) return <div className="card"><h2>Загрузка команды…</h2></div>;
  return <div>
    <div className="pageHead"><div><p className="eyebrow">КОМАНДА</p><h1>{data.company?.name || "Моя команда"}</h1><p className="muted">Сотрудники, роли и приглашения.</p></div><span className="planBadge">{activeCount} участников</span></div>
    {error && <div className="errorText">{error}</div>}
    {data.canManage && <div className="card"><h2>Пригласить сотрудника</h2><div className="goalForm"><input placeholder="email сотрудника" value={email} onChange={(e) => setEmail(e.target.value)} /><select value={role} onChange={(e) => setRole(e.target.value)}><option value="employee">Сотрудник</option><option value="manager">Менеджер</option></select><button className="btn" onClick={invite} disabled={busy}>{busy ? "Создаю…" : "Создать приглашение"}</button></div>{inviteUrl && <p className="muted">Ссылка-приглашение: <code>{typeof window !== "undefined" ? window.location.origin : ""}{inviteUrl}</code></p>}</div>}
    <section className="card"><h2>Участники</h2>{data.members.map((m:any) => <div className="personRow" key={m.id}><div><b>{[m.first_name,m.last_name].filter(Boolean).join(" ") || "Без имени"}</b><small>{m.role} · добавлен {new Date(m.created_at).toLocaleDateString("ru-RU")}</small></div><strong>{m.id.slice(0,8)}…</strong></div>)}</section>
    {data.canManage && <section className="card"><h2>Приглашения</h2>{!data.invitations.length && <p className="muted">Активных приглашений нет.</p>}{data.invitations.map((x:any) => <div className="profileRow" key={x.id}><span>{x.email} · {x.role}</span><b>{x.accepted_at ? "Принято" : new Date(x.expires_at) < new Date() ? "Истекло" : "Ожидает"}</b></div>)}</section>}
  </div>;
}
