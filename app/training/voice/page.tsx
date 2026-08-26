"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

function VoiceTraining() {
  const q = useSearchParams();
  const preset = q.get("scenarioId");

  const [scenarios, setScenarios] = useState<any[]>([]);
  const [scenarioId, setScenarioId] = useState(preset || "");
  const [messages, setMessages] = useState<any[]>([]);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [started, setStarted] = useState<number | null>(null);
  const [transcript, setTranscript] = useState("");
  const [metrics, setMetrics] = useState<any>(null);

  const rec = useRef<any>(null);
  const transcriptRef = useRef("");
  const startedRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/scenarios")
      .then((r) => r.json())
      .then((d) => {
        const a = d.scenarios || [];
        setScenarios(a);

        if (!scenarioId && a[0]) {
          setScenarioId(a[0].id);
        }
      })
      .catch(() => {
        setError("Не удалось загрузить сценарии.");
      });
  }, [scenarioId]);

  const speak = (text: string) => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ru-RU";
    u.rate = 0.95;

    window.speechSynthesis.speak(u);
  };

  const send = async (text: string) => {
    if (!text.trim() || busy) {
      return;
    }

    const next = [
      ...messages,
      {
        role: "manager",
        content: text,
      },
    ];

    setMessages(next);
    setBusy(true);
    setError("");

    try {
      const r = await fetch("/api/training/realtime", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          scenarioId,
          history: next,
        }),
      });

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d.error || "Ошибка AI");
      }

      setMessages([
        ...next,
        {
          role: "client",
          content: d.reply,
        },
      ]);

      speak(d.reply);
    } catch (e: any) {
      setError(e.message || "Ошибка AI");
    } finally {
      setBusy(false);
    }
  };

  const startListening = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SR) {
      setError("Голосовой ввод не поддерживается этим браузером.");
      return;
    }

    setError("");
    setMetrics(null);

    const r = new SR();

    r.lang = "ru-RU";
    r.interimResults = false;
    r.continuous = false;

    const startTime = Date.now();

    startedRef.current = startTime;
    setStarted(startTime);

    transcriptRef.current = "";
    setTranscript("");

    r.onstart = () => {
      setListening(true);
    };

    r.onend = async () => {
      setListening(false);

      const duration = startedRef.current
        ? Date.now() - startedRef.current
        : 0;

      try {
        const response = await fetch(
          "/api/training/voice/metrics",
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              transcript: transcriptRef.current,
              durationMs: duration,
            }),
          }
        );

        const d = await response.json();

        if (d.metrics) {
          setMetrics(d);
        }
      } catch {
        setError("Не удалось выполнить анализ речи.");
      }

      startedRef.current = null;
      setStarted(null);
    };

    r.onerror = () => {
      setListening(false);
      setError("Не удалось распознать речь.");
    };

    r.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      const updatedTranscript = (
        transcriptRef.current +
        " " +
        text
      ).trim();

      transcriptRef.current = updatedTranscript;
      setTranscript(updatedTranscript);

      send(text);
    };

    rec.current = r;

    try {
      r.start();
    } catch {
      setListening(false);
      setError("Не удалось запустить голосовой ввод.");
    }
  };

  const resetTraining = () => {
    setMessages([]);
    setTranscript("");
    setMetrics(null);
    setError("");

    transcriptRef.current = "";
    startedRef.current = null;

    setStarted(null);

    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }

    if (rec.current) {
      try {
        rec.current.stop();
      } catch {}
    }

    setListening(false);
  };

  return (
    <div>
      <div className="pageHead">
        <div>
          <p className="eyebrow">VOICE AI</p>

          <h1>Голосовая тренировка</h1>

          <p className="muted">
            Говори с AI-клиентом вслух. Ответ клиента будет
            озвучен автоматически.
          </p>
        </div>

        <span className="liveBadge">● VOICE</span>
      </div>

      <div className="card voicePicker">
        <label>
          Сценарий

          <select
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
          >
            {scenarios.map((x) => (
              <option key={x.id} value={x.id}>
                {x.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="errorText">
          {error}
        </p>
      )}

      <div className="card voiceChat">
        <div className="voiceMessages">
          {messages.map((m, i) => (
            <div
              className={"bubble " + m.role}
              key={i}
            >
              <small>
                {m.role === "manager"
                  ? "Ты"
                  : "AI-клиент"}
              </small>

              {m.content}
            </div>
          ))}

          {!messages.length && (
            <div className="chatEmpty">
              <div className="voiceOrb">◉</div>

              <h2>Нажми и говори</h2>

              <p className="muted">
                AI будет отвечать голосом.
              </p>
            </div>
          )}
        </div>

        <div className="voiceControls">
          <button
            className={
              "voiceButton " +
              (listening ? "listening" : "")
            }
            onClick={startListening}
            disabled={
              listening ||
              busy ||
              !scenarioId
            }
          >
            {listening
              ? "Слушаю…"
              : "🎙 Говорить"}
          </button>

          <button
            className="ghost"
            onClick={resetTraining}
          >
            Сбросить
          </button>
        </div>

        {metrics && (
          <div className="voiceFeedback">
            <b>Анализ речи</b>

            <span>
              Темп: {metrics.feedback?.pace}
            </span>

            <span>
              Слова: {metrics.metrics?.words}
            </span>

            <span>
              Заполнители:{" "}
              {metrics.metrics?.fillerCount}
            </span>

            <span>
              Паузы:{" "}
              {metrics.metrics?.pauseCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VoiceTrainingPage() {
  return (
    <Suspense
      fallback={
        <div className="card">
          <h2>Загрузка…</h2>
        </div>
      }
    >
      <VoiceTraining />
    </Suspense>
  );
}
