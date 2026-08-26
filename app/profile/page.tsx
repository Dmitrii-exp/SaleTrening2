"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Profile() {
  const router = useRouter();
  const supabase = createClient();
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/me").then(async (r) => { const x = await r.json(); if (!r.ok) throw new Error(x.error || "Ошибка"); return x; }).then(setD).catch((e) => setError(e.message));
  }, []);

  const logout = async () => { await supabase.auth.signOut(); router.push("/login"); router.refresh(); };
  if (error) return <div className="card"><h2>Не удалось загрузить профиль</h2><p className="errorText">{error}</p></div>;
  if (!d) return <div className="card"><h2>Загрузка профиля…</h2></div>;

  const p = d.profile || {};
  const l = d.learning || {};
  const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ") || "Менеджер";
  return <div><div className="pageHead"><div><p className="eyebrow">МОЙ ПРОФИЛЬ</p><h1>Профиль</h1><p className="muted">Персональная AI-траектория и результаты обучения.</p></div><button className="ghost" onClick={logout}>Выйти</button></div><div className="profileHero card"><div className="profileAvatar">{fullName.slice(0, 1).toUpperCase()}</div><div><h1>{fullName}</h1><p className="muted">{p.role || "employee"}</p></div></div><div className="profileKpis"><div className="card"><span>Средний балл</span><b>{l.average_score || 0}%</b></div><div className="card"><span>Тренировок</span><b>{l.total_sessions || 0}</b></div><div className="card"><span>Уровень</span><b>{l.current_difficulty || "medium"}</b></div><div className="card"><span>Фокус</span><b>{l.recommended_focus || "—"}</b></div></div><div className="profileGrid"><section className="card"><h2>Навыки</h2>{Object.entries(l.skill_scores || {}).map(([k, v]: any) => <div className="skillRow" key={k}><span>{k}</span><b>{v}%</b><i><u style={{ width: `${Math.max(0, Math.min(100, Number(v) || 0))}%` }} /></i></div>)}</section><section className="card"><h2>Последние тренировки</h2>{d.sessions.slice(0, 8).map((x: any) => <div className="profileRow" key={x.id}><span>{new Date(x.created_at).toLocaleDateString("ru-RU")}</span><b>{x.score}%</b></div>)}{!d.sessions.length && <p className="muted">Тренировок пока нет.</p>}</section></div></div>;
}
