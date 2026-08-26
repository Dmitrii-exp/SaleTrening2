"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function Realtime(){
  const q=useSearchParams(), router=useRouter(), preset=q.get("scenarioId");
  const [scenarios,setScenarios]=useState<any[]>([]),[scenarioId,setScenarioId]=useState(""),[messages,setMessages]=useState<any[]>([]),[input,setInput]=useState(""),[state,setState]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[result,setResult]=useState<any>(null),[startedAt,setStartedAt]=useState<number|null>(null);

  useEffect(()=>{
    fetch("/api/scenarios").then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Не удалось загрузить сценарии");return d;})
      .then(d=>{const a=d.scenarios||[];setScenarios(a);if(a.length){const requested=preset&&a.some((x:any)=>String(x.id)===String(preset))?String(preset):String(a[0].id);setScenarioId(requested);setStartedAt(Date.now());}})
      .catch((e:Error)=>setError(e.message||"Не удалось загрузить сценарии"));
  },[preset]);

  const reset=()=>{setMessages([]);setState(null);setError("");setResult(null);setStartedAt(Date.now());};

  const finish=async()=>{
    if(!scenarioId||!messages.length||busy)return;
    setBusy(true);setError("");
    try{
      const r=await fetch("/api/training/realtime/complete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scenarioId,messages,state,durationSeconds:startedAt?Math.round((Date.now()-startedAt)/1000):0})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||"Не удалось сохранить тренировку");
      setResult(d);
      if(d.feedbackUrl){router.push(d.feedbackUrl);return;}
      throw new Error("Тренировка сохранена, но ссылка на AI-разбор не получена");
    }catch(e:any){setError(e?.message||"Не удалось завершить тренировку");setBusy(false);}
  };

  const send=async()=>{
    if(!input.trim()||busy||!scenarioId)return;
    const next=[...messages,{role:"manager",content:input.trim()}];setMessages(next);setInput("");setBusy(true);setError("");
    try{
      const r=await fetch("/api/training/realtime",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scenarioId,history:next,state})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||"Ошибка тренировки");
      setMessages([...next,{role:"client",content:d.reply}]);setState(d.state);
    }catch(e:any){setError(e?.message||"Ошибка тренировки");}finally{setBusy(false);}
  };

  return <div><div className="pageHead"><div><p className="eyebrow">REAL-TIME AI</p><h1>Живой клиент</h1><p className="muted">Сложность клиента адаптируется под твой прогресс.</p></div></div>
    <div className="card scenarioPicker"><label>Сценарий<select value={scenarioId} onChange={e=>{setScenarioId(e.target.value);reset()}} disabled={busy}>{scenarios.map(x=><option key={x.id} value={x.id}>{x.title} · {x.difficulty}</option>)}</select></label><button className="ghost" onClick={reset} disabled={busy}>Сбросить</button></div>
    {error&&<div className="errorText">{error}</div>}
    <div className="realtimeGrid"><div className="card chatWindow"><div className="chatMessages">{!messages.length&&<div className="chatEmpty"><div className="avatar">AI</div><h2>Начни разговор</h2><p className="muted">Поздоровайся с клиентом.</p></div>}{messages.map((m,i)=><div className={"bubble "+m.role} key={i}><small>{m.role==="manager"?"Ты":"Клиент"}</small>{m.content}</div>)}{busy&&<div className="bubble client">Обрабатываю…</div>}</div>
      <div className="chatInput"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Реплика менеджера…" disabled={busy||!scenarioId}/><button className="btn" onClick={send} disabled={busy||!scenarioId||!input.trim()}>Отправить</button></div>
      {messages.length>0&&<button className="finishBtn" onClick={finish} disabled={busy}>{busy?"Сохраняю…":"Завершить тренировку"}</button>}
      {result&&!busy&&<div className="resultBox"><b>Тренировка сохранена</b><strong>{result.score}%</strong></div>}</div>
      <div className="card coachPanel"><h2>Состояние тренировки</h2>{state?<div className="engineStats"><span>Этап: {state.stage}</span><span>Доверие: {state.trust}%</span><span>Сопротивление: {state.resistance}%</span><span>Покупка: {state.buyProbability}%</span></div>:<p className="muted">Состояние появится после первой реплики.</p>}</div></div></div>
}

export default function RealtimePage(){return <Suspense fallback={<div className="card"><h2>Загрузка…</h2></div>}><Realtime/></Suspense>}
