"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", industry: "", company_size: "", description: "", training_goal: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await fetch("/api/company", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, onboarding_completed: true }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Не удалось сохранить"); router.push("/team");
    } catch (e: any) { setError(e.message || "Ошибка"); } finally { setBusy(false); }
  };

  return <div className="card" style={{ maxWidth: 760, margin: "40px auto" }}><p className="eyebrow">ПЕРВЫЙ ЗАПУСК</p><h1>Настроим SaleTrening под вашу компанию</h1><p className="muted">Эти данные используются для сценариев и персонализации обучения.</p><form onSubmit={submit}><label>Название компании<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Отрасль<input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></label><label>Размер команды<input value={form.company_size} onChange={(e) => setForm({ ...form, company_size: e.target.value })} placeholder="Например, 10-50" /></label><label>О компании<textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label>Главная цель обучения<textarea rows={3} value={form.training_goal} onChange={(e) => setForm({ ...form, training_goal: e.target.value })} placeholder="Например: повысить конверсию и качество работы с возражениями" /></label>{error && <p className="errorText">{error}</p>}<button className="btn" disabled={busy}>{busy ? "Сохраняю…" : "Завершить настройку"}</button></form></div>;
}
