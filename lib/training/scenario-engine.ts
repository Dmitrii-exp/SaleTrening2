import { EngineState, ScenarioConfig, ScenarioStage } from "./scenario-types";

const QUESTION_RE = /\?|как|что|почему|какой|какая|какие|расскажите|подскажите|сколько|когда|кто/;
const PRESSURE_RE = /скид|берите|вам надо|последняя цена|срочно|решайтесь|бюджет же есть/;
const VALUE_RE = /выгод|эконом|результат|ценност|реш|помож|срок|окуп|польз/;
const CLOSE_RE = /договор|оформ|заказать|следующ|встреч|соглас|запустить|подпис/;
const OBJECTION_RE = /дорог|конкурент|подума|не готовы|не нужно|нет бюджета|письм|пришлите КП/;

export function analyzeTurn(text: string, state: EngineState, config: ScenarioConfig): EngineState {
  const t = text.trim().toLowerCase();
  const discovery = QUESTION_RE.test(t);
  const pressure = PRESSURE_RE.test(t);
  const value = VALUE_RE.test(t);
  const close = CLOSE_RE.test(t);
  const objection = OBJECTION_RE.test(t);

  let resistance = state.resistance;
  let trust = state.trust;
  let buyProbability = state.buyProbability;
  let stage: ScenarioStage = state.stage;
  const stageScores = { ...(state.stageScores || { opening: 0, discovery: 0, objection: 0, value: 0, closing: 0 }) };

  if (discovery) {
    trust += 6;
    resistance -= 4;
    stageScores.discovery = Math.min(100, stageScores.discovery + 10);
    if (stage === "opening") stage = "discovery";
  }

  if (value) {
    trust += 5;
    buyProbability += 5;
    stageScores.value = Math.min(100, stageScores.value + 10);
    if (stage === "discovery") stage = "value";
  }

  if (objection) {
    stage = "objection";
    stageScores.objection = Math.min(100, stageScores.objection + 6);
    resistance += 3;
  }

  if (pressure) {
    resistance += 8 + Math.round(config.aggression / 10);
    trust -= 6;
    buyProbability -= 5;
  }

  if (close && trust > 35) {
    buyProbability += 7;
    stageScores.closing = Math.min(100, stageScores.closing + 12);
    stage = "closing";
  }

  if (state.turn === 0) {
    stageScores.opening = Math.min(100, stageScores.opening + 8);
  }

  if (resistance > 70) stage = "objection";

  return {
    stage,
    resistance: Math.max(0, Math.min(100, resistance)),
    trust: Math.max(0, Math.min(100, trust)),
    buyProbability: Math.max(5, Math.min(95, buyProbability)),
    turn: state.turn + 1,
    stageScores,
  };
}

export function calculateTrainingScore(state: EngineState, messages: Array<{ role?: string; content?: string }>, config: ScenarioConfig) {
  const managerMessages = messages.filter((m) => m.role === "manager");
  const text = managerMessages.map((m) => String(m.content || "")).join(" ").toLowerCase();
  const questionHits = managerMessages.filter((m) => QUESTION_RE.test(String(m.content || "").toLowerCase())).length;
  const valueHits = managerMessages.filter((m) => VALUE_RE.test(String(m.content || "").toLowerCase())).length;
  const closeHits = managerMessages.filter((m) => CLOSE_RE.test(String(m.content || "").toLowerCase())).length;
  const pressureHits = managerMessages.filter((m) => PRESSURE_RE.test(String(m.content || "").toLowerCase())).length;

  const base = 45;
  const trustBonus = Math.round(state.trust * 0.18);
  const buyBonus = Math.round(state.buyProbability * 0.16);
  const discoveryBonus = Math.min(10, questionHits * 2);
  const valueBonus = Math.min(10, valueHits * 3);
  const closingBonus = Math.min(10, closeHits * 3);
  const pressurePenalty = Math.min(18, pressureHits * 6);
  const lengthBonus = text.length >= 180 ? 4 : text.length >= 80 ? 2 : 0;

  let score = base + trustBonus + buyBonus + discoveryBonus + valueBonus + closingBonus + lengthBonus - pressurePenalty;

  const requiredHits = config.requiredQuestions.filter((q) => {
    const normalized = q.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    return normalized.some((w) => text.includes(w));
  }).length;
  if (config.requiredQuestions.length) {
    score += Math.round((requiredHits / config.requiredQuestions.length) * 8);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function clientInstruction(s: EngineState, c: ScenarioConfig) {
  if (s.resistance > 70) return "Усиль сопротивление. Попроси обосновать выгоду и не соглашайся сразу.";
  if (s.stage === "discovery") return `Постепенно раскрывай задачу/потребность клиента: ${c.hiddenNeed}. Не выдавай всё сразу.`;
  if (s.stage === "objection") return `Используй одно релевантное возражение из списка: ${c.objections.join("; ") || "дорого"}.`;
  if (s.stage === "value") return "Попроси конкретику по результату, срокам, доказательствам и условиям.";
  if (s.stage === "closing") return "Если менеджер корректно подвёл к следующему шагу, прояви готовность зафиксировать действие.";
  return `Поведение клиента: ${c.clientMood}. Начни разговор естественно и не раскрывай всю потребность сразу.`;
}
