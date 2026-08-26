export type ScenarioStage="opening"|"discovery"|"objection"|"value"|"closing";
export type ScenarioConfig={id:string;title:string;persona:string;goal:string;hiddenNeed:string;objections:string[];aggression:number;buyProbability:number;difficulty:"easy"|"medium"|"hard"};
export type EngineState={stage:ScenarioStage;resistance:number;trust:number;buyProbability:number;turn:number};
export const defaultState:EngineState={stage:"opening",resistance:20,trust:30,buyProbability:35,turn:0};
export function normalizeScenario(x:any):ScenarioConfig{return{id:String(x.id),title:x.title||"AI-сценарий",persona:x.persona||"Сомневающийся клиент",goal:x.goal||"Выбрать подходящее решение",hiddenNeed:x.hidden_need||"",objections:Array.isArray(x.objections)?x.objections:[],aggression:Number(x.aggression??50),buyProbability:Number(x.buy_probability??35),difficulty:["easy","medium","hard"].includes(x.difficulty)?x.difficulty:"medium"}}
