"use client";

import { useEffect, useState } from "react";

export default function AssignmentsPage() {
  const [data, setData] = useState<any>(null);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [scenarioId, setScenarioId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueAt, setDueAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const response = await fetch("/api/assignments");
    const next = await response.json();
    if (!response.ok) throw new Error(next.error || "Не удалось загрузить назначения");
    setData(next);
  };

  useEffect(() => {
    Promise.all([
      load(),
      fetch("/api/scenarios").then((response) => response.json()),
    ])
      .then(([, scenarioData]) => setScenarios(scenarioData.scenarios || []))
      .catch((err) => setError(err.message || "Ошибка загрузки"));
  }, []);

  const createAssignment = async () => {
    if (!employeeId.trim() || !title.trim()) {
      setError("Укажи ID сотрудника и название задания.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          employeeId: employeeId.trim(),
          scenarioId: scenarioId || null,
          title: title.trim(),
          description: description.trim(),
          priority,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось назначить тренировку");
      setTitle("");
      setDescription("");
      setScenarioId("");
      setDueAt("");
      await load();
    } catch (err: any) {
      setError(err.message || "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="card"><h2>Загрузка назначений…</h2>{error && <p className="errorText">{error}</p>}</div>;

  return (
    <div>
      <div className="pageHead">
        <div>
          <p className="eyebrow">КОМАНДА</p>
          <h1>Назначения</h1>
          <p className="muted">Руководитель назначает сотрудникам конкретные тренировки и сроки.</p>
        </div>
      </div>

      {data.canManage && (
        <section className="card goalForm">
          <h2>Новое назначение</h2>
          <input placeholder="ID сотрудника" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
          <input placeholder="Название задания" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea placeholder="Описание и ожидаемый результат" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          <label>
            Сценарий
            <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
              <option value="">Без конкретного сценария</option>
              {scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.title}</option>)}
            </select>
          </label>
          <label>
            Приоритет
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="high">Высокий</option>
              <option value="medium">Средний</option>
              <option value="low">Низкий</option>
            </select>
          </label>
          <label>
            Срок
            <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </label>
          <button className="btn" onClick={createAssignment} disabled={busy}>{busy ? "Назначаю…" : "Назначить тренировку"}</button>
        </section>
      )}

      {error && <p className="errorText">{error}</p>}

      <section className="card">
        <h2>Мои назначения</h2>
        {!data.assignments.length ? (
          <p className="muted">Назначений пока нет.</p>
        ) : (
          <div className="historyList">
            {data.assignments.map((item: any) => (
              <article className="historyRow" key={item.id}>
                <div>
                  <b>{item.title}</b>
                  <small>{item.description || "Без дополнительного описания"}</small>
                  <small>{item.scenario?.title || "Свободная тренировка"}{item.due_at ? ` · до ${new Date(item.due_at).toLocaleString("ru-RU")}` : ""}</small>
                </div>
                <div>
                  <span>{item.priority}</span>
                  <small>{item.status}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
