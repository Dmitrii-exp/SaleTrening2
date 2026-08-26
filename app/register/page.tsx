"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    if (form.password !== form.confirm) { setError("Пароли не совпадают"); setBusy(false); return; }
    if (form.password.length < 8) { setError("Пароль должен содержать минимум 8 символов"); setBusy(false); return; }
    const { data, error: authError } = await supabase.auth.signUp({ email: form.email.trim(), password: form.password, options: { data: { first_name: form.firstName.trim(), last_name: form.lastName.trim() } } });
    if (authError) setError(authError.message || "Не удалось зарегистрироваться");
    else if (data.session) router.push("/onboarding");
    else setMessage("Регистрация создана. Проверьте email и подтвердите адрес, затем войдите.");
    setBusy(false);
  };

  return <div className="card" style={{ maxWidth: 520, margin: "50px auto" }}><p className="eyebrow">SALE TRENING</p><h1>Создать аккаунт</h1><p className="muted">Первый аккаунт компании станет владельцем рабочего пространства после onboarding.</p><form onSubmit={submit}><div className="goalForm"><label>Имя<input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label><label>Фамилия<input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label></div><label>Email<input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Пароль<input type="password" autoComplete="new-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label><label>Повтор пароля<input type="password" autoComplete="new-password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} /></label>{error && <p className="errorText">{error}</p>}{message && <p className="muted">{message}</p>}<button className="btn" disabled={busy}>{busy ? "Создаю аккаунт…" : "Зарегистрироваться"}</button></form><p className="muted">Уже есть аккаунт? <Link href="/login">Войти</Link></p></div>;
}
