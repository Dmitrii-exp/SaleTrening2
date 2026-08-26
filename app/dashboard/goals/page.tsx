"use client";

import { useEffect, useState } from "react";

export default function Goals() {
  const [d, setD] = useState<any>(null);
  const [emp, setEmp] = useState("");
  const [score, setScore] = useState(80);
  const [sessions, setSessions] = useState(10);

  const load = () => {
    fetch("/api/dashboard/goals")
      .then((r) => r.json())
      .then(setD);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!emp) return;

    await fetch("/api/dashboard/goals", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        employeeId: emp,
        targetScore: score,
        targetSessions: sessions,
      }),
    });

    setEmp("");
    load();
  };

  if (!d) {
    return (
      <div className="card">
        <h2>Загрузка KPI…</h2>
      </div>
    );
  }

  return (
    <div>
      <div className="pageHead">
        <div>
          <p className="eyebrow">KPI ОБУЧЕНИЯ</p>

          <h1>Цели менеджеров</h1>

          <p className="muted">
            Задавай измеримые цели и отслеживай их выполнение.
          </p>
        </div>
      </div>

      <div className="card goalForm">
        <input
          placeholder="ID сотрудника"
          value={emp}
          onChange={(e) => setEmp(e.target.value)}
        />

        <label>
          Цель балла
          <input
            type="number"
            min="0"
            max="100"
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
          />
        </label>

        <label>
          Тренировок
          <input
            type="number"
            min="1"
            value={sessions}
            onChange={(e) => setSessions(Number(e.target.value))}
          />
        </label>

        <button className="btn" onClick={add}>
          Поставить цель
        </button>
      </div>

      <div className="goalList">
        {d.goals.map((x: any) => (
          <div className="card goalRow" key={x.id}>
            <div>
              <b>{x.employee_id.slice(0, 8)}…</b>

              <small>
                До{" "}
                {new Date(x.period_end).toLocaleDateString("ru-RU")}
              </small>
            </div>

            <div>
              <span>Баллы</span>

              <strong>
                {x.actualScore}% / {x.target_score}%
              </strong>

              <i>
                <u
                  style={{
                    width: `${Math.min(
                      100,
                      (Number(x.actualScore) /
                        Number(x.target_score)) *
                        100
                    )}%`,
                  }}
                />
              </i>
            </div>

            <div>
              <span>Тренировки</span>

              <strong>
                {x.actualSessions} / {x.target_sessions}
              </strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
