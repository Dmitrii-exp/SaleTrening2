"use client";
import { useEffect, useState } from "react";

export default function EffectivenessPage() {
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/analytics/effectiveness").then(async (r) => { const x = await r.json(); if (!r.ok) throw new Error(x.error || "Ошибка"); return x; }).then(setD).catch((e) => setError(e.message)); }, []);
  if (error) return <div className="card"><h2>Не удалось загрузить аналитику</h2><p className="errorText">{error}</p></div>;
  if (!d) return <div className="card"><h2>Считаю эффективность…</h2></div>;
  return <div><div className="pageHead"><div><p className="eyebrow">ЭФФЕКТИВНОСТЬ</p><h1>Прогресс команды</h1><p className="muted">Как меняются результаты менеджеров после тренировок.</p></div><span className="planBadge">{d.averageImprovement >= 0 ? "+" : ""}{d.averageImprovement} п.п.</span></div><div className="dashKpis"><div className="card"><span>Среднее улучшение</span><b>{d.averageImprovement >= 0 ? "+" : ""}{d.averageImprovement}</b></div><div className="card"><span>Растут</span><b>{d.positive}</b></div><div className="card"><span>Без изменений</span><b>{d.unchanged}</b></div><div className="card"><span>Снижаются</span><b>{d.negative}</b></div></div><section className="card"><h2>По сотрудникам</h2>{d.employees.length === 0 && <p className="muted">Пока недостаточно тренировок для сравнения.</p>}{d.employees.map((x:any) => <div className="personRow" key={x.employeeId}><div><b>{x.employeeId.slice(0,8)}…</b><small>{x.sessions} тренировок · первый результат {x.firstScore}% · последние {x.latestScore}%</small></div><strong>{x.improvement >= 0 ? "+" : ""}{x.improvement} п.п.</strong></div>)}</section></div>;
}
