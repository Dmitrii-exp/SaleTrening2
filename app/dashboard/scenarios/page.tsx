"use client";
import { useEffect, useState } from "react";

const empty = { title: "", description: "", difficulty: "Средний", client_role: "ЛПР", industry: "B2B", objective: "", client_mood: "Нейтральный", goal: "", objections: "", required_questions: "", success_actions: "", failure_actions: "", system_prompt: "" };
const arr = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);

export default function ScenariosAdmin() {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => fetch("/api/scenarios").then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Ошибка"); return d; }).then((d) => setScenarios(d.scenarios || [])).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    const payload = { ...form, objections: arr(form.objections), required_questions: arr(form.required_questions), success_actions: arr(form.success_actions), failure_actions: arr(form.failure_actions) };
    try {
      const r = await fetch("/api/scenarios", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(editing ? { ...payload, id: editing } : payload) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Не удалось сохранить"); setForm(empty); setEditing(null); load();
    } catch (e: any) { setError(e.message || "Ошибка"); } finally { setBusy(false); }
  };

  const edit = (x: any) => setForm({ ...empty, ...x, objections: (x.objections || []).join("\n"), required_questions: (x.required_questions || []).join("\n"), success_actions: (x.success_actions || []).join("\n"), failure_actions: (x.failure_actions || []).join("\n"), system_prompt: x.system_prompt || "" });

  return <div><div className="pageHead"><div><p className="eyebrow">БИБЛИОТЕКА</p><h1>Сценарии AI</h1><p className="muted">Создание и настройка тренировочных сценариев.</p></div></div>{error && <div className="errorText">{error}</div>}<form className="card" onSubmit={save}><h2>{editing ? "Редактировать сценарий" : "Новый сценарий"}</h2><label>Название<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>Цель<input required value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} /></label><label>Описание<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><div className="goalForm"><label>Сложность<select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}><option>Лёгкий</option><option>Средний</option><option>Сложный</option></select></label><label>Роль клиента<input value={form.client_role} onChange={(e) => setForm({ ...form, client_role: e.target.value })} /></label><label>Отрасль<input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></label></div><label>Возражения<textarea rows={3} placeholder="Одно возражение на строку" value={form.objections} onChange={(e) => setForm({ ...form, objections: e.target.value })} /></label><label>Обязательные вопросы<textarea rows={3} placeholder="Один вопрос/критерий на строку" value={form.required_questions} onChange={(e) => setForm({ ...form, required_questions: e.target.value })} /></label><label>Успешные действия<textarea rows={3} value={form.success_actions} onChange={(e) => setForm({ ...form, success_actions: e.target.value })} /></label><label>Ошибки/неуспешные действия<textarea rows={3} value={form.failure_actions} onChange={(e) => setForm({ ...form, failure_actions: e.target.value })} /></label><label>Системная инструкция AI<textarea rows={4} value={form.system_prompt} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} /></label><button className="btn" disabled={busy}>{busy ? "Сохраняю…" : editing ? "Сохранить изменения" : "Создать сценарий"}</button>{editing && <button type="button" className="ghost" onClick={() => { setEditing(null); setForm(empty); }}>Отмена</button>}</form><section className="card"><h2>Активные сценарии</h2>{scenarios.map((x) => <div className="personRow" key={x.id}><div><b>{x.title}</b><small>{x.client_role || "ЛПР"} · {x.difficulty} · {x.objective}</small></div><button className="ghost" onClick={() => { setEditing(x.id); edit(x); }}>Изменить</button></div>)}</section></div>;
}
