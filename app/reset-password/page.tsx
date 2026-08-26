"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
  }, [supabase.auth]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage("");
    if (password.length < 8) { setMessage("Пароль должен содержать минимум 8 символов"); return; }
    if (password !== confirm) { setMessage("Пароли не совпадают"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message); else { setMessage("Пароль изменён"); setTimeout(() => router.push("/"), 500); }
    setBusy(false);
  };

  if (!ready) return <div className="card" style={{ maxWidth: 460, margin: "80px auto" }}><h2>Проверяю ссылку…</h2></div>;
  return <div className="card" style={{ maxWidth: 460, margin: "80px auto" }}><p className="eyebrow">БЕЗОПАСНОСТЬ</p><h1>Новый пароль</h1><form onSubmit={submit}><label>Новый пароль<input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label><label>Повтор пароля<input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>{message && <p className="muted">{message}</p>}<button className="btn" disabled={busy}>{busy ? "Сохраняю…" : "Изменить пароль"}</button></form></div>;
}
