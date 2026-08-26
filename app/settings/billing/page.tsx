"use client";
import { useEffect, useState } from "react";

export default function BillingPage() {
  const [d, setD] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = () => fetch("/api/billing").then(async (r) => { const x = await r.json(); if (!r.ok) throw new Error(x.error || "Ошибка"); return x; }).then(setD).catch((e) => setMessage(e.message));
  useEffect(() => { load(); }, []);
  const changePlan = async (planId: string) => { if (!d?.canManage || busy) return; setBusy(true); setMessage(""); try { const r = await fetch("/api/billing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ planId }) }); const x = await r.json(); if (!r.ok) throw new Error(x.error || "Ошибка"); setMessage("Тариф обновлён"); load(); } catch (e: any) { setMessage(e.message || "Ошибка"); } finally { setBusy(false); } };
  if (!d) return <div className="card"><h2>Загрузка тарифов…</h2>{message && <p className="errorText">{message}</p>}</div>;
  const current = d.plan;
  return <div><div className="pageHead"><div><p className="eyebrow">SaaS</p><h1>Тариф и использование</h1><p className="muted">Лимиты SaleTrening для вашей компании.</p></div>{current && <span className="planBadge">{current.name}</span>}</div><section className="dashKpis"><div className="card"><span>Статус</span><b>{d.subscription?.status || "trial"}</b></div><div className="card"><span>Тренировок в тарифе</span><b>{current?.training_limit ?? "—"}</b></div><div className="card"><span>Сотрудников в тарифе</span><b>{current?.employee_limit ?? "—"}</b></div><div className="card"><span>Период до</span><b>{d.subscription?.current_period_end ? new Date(d.subscription.current_period_end).toLocaleDateString("ru-RU") : "—"}</b></div></section><section className="card"><h2>Тарифы</h2>{d.plans.map((p:any)=><div className="personRow" key={p.id}><div><b>{p.name}</b><small>{p.price_monthly ? `${p.price_monthly / 100} ₽/мес.` : "Бесплатно"} · до {p.training_limit} тренировок · до {p.employee_limit} сотрудников</small></div>{d.canManage && <button className="ghost" onClick={() => changePlan(p.id)} disabled={busy}>{p.id === d.subscription?.plan_id ? "Текущий" : "Выбрать"}</button>}</div>)}</section>{message && <p className="muted">{message}</p>}<section className="card"><h2>Оплата</h2><p className="muted">Подключение банковской оплаты требует выбранного платёжного провайдера и его реквизитов. В приложении пока работает управление тарифом и лимитами без фиктивного эквайринга.</p></section></div>;
}
