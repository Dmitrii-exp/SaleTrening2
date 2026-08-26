export type Difficulty="easy"|"medium"|"hard";
export function adaptiveDifficulty(profile:any,scenario:any):Difficulty{
 const avg=Number(profile?.average_score||50); const current=profile?.current_difficulty||"medium";
 const map:Record<string,number>={easy:1,medium:2,hard:3}; let level=map[current]||2;
 if(avg>=85)level=Math.min(3,level+1); else if(avg<55)level=Math.max(1,level-1);
 const target=map[scenario?.difficulty]||2;
 if(level>target+1)level=target+1; if(level<target-1)level=target-1;
 return level===1?"easy":level===3?"hard":"medium";
}
export function difficultyInstruction(d:Difficulty){return d==="hard"?"Будь требовательным: задавай короткие вопросы, чаще возражай, не соглашайся после первой попытки.":d==="easy"?"Дай менеджеру больше пространства: раскрывай потребность чуть быстрее и не усиливай сопротивление без причины.":"Веди себя реалистично: умеренное сопротивление, естественные уточнения и 1-2 возражения."}
