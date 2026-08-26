"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type HistoryItem = {
  id: string;
  scenario_id: number;
  score: number;
  duration_seconds: number;
  created_at: string;
  completed_at: string | null;
  scenario?: { title?: string; difficulty?: string; client_role?: string } | null;
  feedback?: { summary?: string; next_training_focus?: string } | null;
};

function scoreClass(score: number) {
  if (score >= 80) return "good";
  if (score >= 60) return "mid";
  return "low";
}

export default function TrainingHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/training/history?limit=30")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Не удалось загрузить историю");
        return data;
      })
      .then((data) => setItems(data.history || []))
      .catch((err) => setError(err.message || "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card"><h2>Загрузка истории…</h2></div>;
  if (error) return <div className="card"><h2>Не удалось загрузить историю</h2><p className="errorText">{error}</p></div>;

  return (
    <div>
      <div className="pageHead">
        <div>
          <p className="eyebrow">ИСТОРИЯ</p>
          <h1>Мои тренировки</h1>
          <p className="muted">Результаты, длительность и AI-разбор каждой завершённой тренировки.</p>
        </div>
        <Link className="btn" href="/training/realtime">Новая тренировка</Link>
      </div>

      <div className="card">
        {!items.length ? (
          <div className="chatEmpty">
            <h2>История пока пустая</h2>
            <p className="muted">Заверши первую AI-тренировку, и результат появится здесь.</p>
            <Link className="btn" href="/training/realtime">Начать тренировку</Link>
          </div>
        ) : (
          <div className="historyList">
            {items.map((item) => (
              <article className="historyRow" key={item.id}>
                <div>
                  <b>{item.scenario?.title || `Сценарий #${item.scenario_id}`}</b>
                  <small>
                    {new Date(item.created_at).toLocaleString("ru-RU")}
                    {item.scenario?.client_role ? ` · ${item.scenario.client_role}` : ""}
                  </small>
                </div>
                <div className="historyScore">
                  <span className={scoreClass(item.score)}>{item.score}%</span>
                  <small>{Math.max(0, Math.round(item.duration_seconds / 60))} мин.</small>
                </div>
                <div className="historyActions">
                  {item.feedback ? (
                    <Link className="ghost" href={`/training/realtime/feedback?sessionId=${encodeURIComponent(item.id)}`}>AI-разбор</Link>
                  ) : (
                    <Link className="ghost" href={`/training/realtime/feedback?sessionId=${encodeURIComponent(item.id)}`}>Сформировать разбор</Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
