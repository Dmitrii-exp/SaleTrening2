"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) setError(authError.message || "Не удалось войти");
    else router.push("/");
    setBusy(false);
  };

  return <div className="card" style={{ maxWidth: 460, margin: "80px auto" }}><p className="eyebrow">SALE TRENING</p><h1>Вход</h1><p className="muted">Войди в личный кабинет и продолжи обучение.</p><form onSubmit={submit}><label>Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Пароль<input type="password" autoComplete="current-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <p className="errorText">{error}</p>}<button className="btn" disabled={busy}>{busy ? "Выполняю вход…" : "Войти"}</button></form><p className="muted">Нет аккаунта? <Link href="/register">Зарегистрироваться</Link></p></div>;
}
