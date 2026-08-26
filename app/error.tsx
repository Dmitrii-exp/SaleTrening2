"use client";
import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("SaleTrening page error", error); }, [error]);
  return <main className="appMain"><div className="card" style={{ maxWidth: 680, margin: "80px auto" }}><p className="eyebrow">SALE TRENING</p><h1>Что-то пошло не так</h1><p className="muted">Страница столкнулась с ошибкой. Повторите попытку или вернитесь на главную.</p><div style={{ display: "flex", gap: 12 }}><button className="btn" onClick={() => reset()}>Повторить</button><a className="ghost" href="/">На главную</a></div></div></main>;
}
