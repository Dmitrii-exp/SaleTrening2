export type ScenarioStage = "opening" | "discovery" | "objection" | "value" | "closing";

export type ScenarioConfig = {
  id: string;
  title: string;
  description: string;
  persona: string;
  goal: string;
  hiddenNeed: string;
  objections: string[];
  requiredQuestions: string[];
  successActions: string[];
  failureActions: string[];
  evaluationCriteria: Record<string, unknown>;
  systemPrompt: string;
  clientMood: string;
  industry: string;
  aggression: number;
  buyProbability: number;
  difficulty: "easy" | "medium" | "hard";
};

export type EngineState = {
  stage: ScenarioStage;
  resistance: number;
  trust: number;
  buyProbability: number;
  turn: number;
  stageScores?: Record<ScenarioStage, number>;
};

export const defaultState: EngineState = {
  stage: "opening",
  resistance: 20,
  trust: 30,
  buyProbability: 35,
  turn: 0,
  stageScores: {
    opening: 0,
    discovery: 0,
    objection: 0,
    value: 0,
    closing: 0,
  },
};

function normalizeDifficulty(value: unknown): ScenarioConfig["difficulty"] {
  const v = String(value || "").trim().toLowerCase();
  if (["easy", "легкий", "лёгкий", "начальный"].includes(v)) return "easy";
  if (["hard", "сложный", "высокий", "высокая"].includes(v)) return "hard";
  return "medium";
}

export function normalizeScenario(x: Record<string, any>): ScenarioConfig {
  const difficulty = normalizeDifficulty(x.difficulty);
  const objective = String(x.objective || x.goal || "Выявить потребность и договориться о следующем шаге");
  return {
    id: String(x.id),
    title: String(x.title || "AI-сценарий"),
    description: String(x.description || objective),
    persona: String(x.client_role || x.persona || "Сомневающийся клиент"),
    goal: String(x.goal || objective),
    hiddenNeed: String(x.hidden_need || x.objective || ""),
    objections: Array.isArray(x.objections) ? x.objections.map(String) : [],
    requiredQuestions: Array.isArray(x.required_questions) ? x.required_questions.map(String) : [],
    successActions: Array.isArray(x.success_actions) ? x.success_actions.map(String) : [],
    failureActions: Array.isArray(x.failure_actions) ? x.failure_actions.map(String) : [],
    evaluationCriteria: x.evaluation_criteria && typeof x.evaluation_criteria === "object" ? x.evaluation_criteria : {},
    systemPrompt: String(x.system_prompt || ""),
    clientMood: String(x.client_mood || "Нейтральный"),
    industry: String(x.industry || "B2B"),
    aggression: Number(x.aggression ?? (difficulty === "hard" ? 75 : difficulty === "easy" ? 30 : 50)),
    buyProbability: Number(x.buy_probability ?? 35),
    difficulty,
  };
}
