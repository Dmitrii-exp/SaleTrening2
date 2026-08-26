"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const q = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(q.get("error") || "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) setError(authError.message || "Не удалось войти"); else router.push("/");
    setBusy(false);
  };

  const reset = async () => {
    if (!email.trim()) { setError("Сначала укажи email"); return; }
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setError(resetError ? resetError.message : "Письмо для восстановления отправлено.");
  };

  return <div className="card" style={{ maxWidth: 460, margin: "80px auto" }}><p className="eyebrow">SALE TRENING</p><h1>Вход</h1><p className="muted">Войди в личный кабинет и продолжи обучение.</p><form onSubmit={submit}><label>Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Пароль<input type="password" autoComplete="current-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <p className="errorText">{error}</p>}<button className="btn" disabled={busy}>{busy ? "Выполняю вход…" : "Войти"}</button></form><div style={{ display: "flex", gap: 12, marginTop: 12 }}><button type="button" className="ghost" onClick={reset}>Забыли пароль?</button><Link className="ghost" href="/register">Регистрация</Link></div></div>;
}

export default function LoginPage() { return <Suspense fallback={<div className="card"><h2>Загрузка…</h2></div>}><LoginForm /></Suspense>; }
