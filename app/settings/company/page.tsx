"use client";
import { useEffect, useState } from "react";

export default function CompanySettingsPage() {
  const [d, setD] = useState<any>(null);
  const [form, setForm] = useState({ name: "", industry: "", company_size: "", description: "", training_goal: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/company").then(async (r) => { const x = await r.json(); if (!r.ok) throw new Error(x.error || "Ошибка"); return x; }).then((x) => { setD(x); setForm({ name: x.company?.name || "", industry: x.company?.industry || "", company_size: x.company?.company_size || "", description: x.company?.description || "", training_goal: x.company?.training_goal || "" }); }).catch((e) => setMessage(e.message));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/company", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const x = await r.json(); if (!r.ok) throw new Error(x.error || "Не удалось сохранить"); setD({ ...d, company: x.company }); setMessage("Сохранено");
    } catch (e: any) { setMessage(e.message || "Ошибка"); } finally { setBusy(false); }
  };

  if (!d) return <div className="card"><h2>Загрузка настроек…</h2></div>;
  if (!d.canManage) return <div className="card"><h2>Доступ запрещён</h2><p className="muted">Настройки компании доступны руководителю.</p></div>;

  return <div><div className="pageHead"><div><p className="eyebrow">КОМПАНИЯ</p><h1>Настройки компании</h1><p className="muted">Данные компании используются для персонализации обучения.</p></div></div><form className="card" onSubmit={save}><label>Название<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>Отрасль<input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></label><label>Размер компании<input value={form.company_size} onChange={(e) => setForm({ ...form, company_size: e.target.value })} /></label><label>Описание<textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label>Цель обучения<textarea rows={3} value={form.training_goal} onChange={(e) => setForm({ ...form, training_goal: e.target.value })} /></label><button className="btn" disabled={busy}>{busy ? "Сохраняю…" : "Сохранить"}</button>{message && <p className="muted">{message}</p>}</form></div>;
}
