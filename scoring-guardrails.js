
/**
 * Safety rails on top of the AI rubric. Prevents trivially short or
 * repetitive input from receiving an implausibly high practice grade.
 * It does not award credits for word count and never increases scores.
 */
export function calibrateDebrief(data, transcript){
 const student=(Array.isArray(transcript)?transcript:[]).filter(x=>x.role==="student"||x.role==="user")
  .map(x=>String(x.text||"").trim());
 const turnCount=student.length;
 const normalized=student.map(x=>x.toLowerCase().replace(/[^a-z0-9]+/g," ").trim());
 const distinct=new Set(normalized).size;
 const repetitive=turnCount>=2&&distinct<=Math.max(1,Math.floor(turnCount/3));
 const lowEffort=student.filter(t=>/^(?:test|testing|asdf|qwerty|lorem ipsum|hello|hi|ok|okay|yes|no|123|random)(?:\s+(?:test|asdf|qwerty|123))*[.!?]*$/i.test(t)).length;
 const emptyOrShort=student.filter(t=>t.replace(/[^a-z0-9]/gi,"").length<4).length;
 let limit=100,reason="";
 if(turnCount===0){limit=0;reason="No student messages were submitted."}
 else if(turnCount===1){limit=25;reason="A single reply cannot demonstrate a full setter conversation."}
 else if(repetitive||lowEffort>=Math.ceil(turnCount/2)){limit=15;reason="Repeated or placeholder messages do not demonstrate appointment-setting competence."}
 else if(emptyOrShort>=Math.ceil(turnCount*0.7)&&turnCount>=3){limit=30;reason="Too little substantive conversation to assess reliably."}
 else if(turnCount===2){limit=45;reason="Two replies offer limited evidence of sustained discovery, qualification or objection handling."}
 const original=Number(data?.overall_score);
 const score=Number.isFinite(original)?Math.max(0,Math.min(100,Math.round(original))):0;
 const nextScore=Math.min(score,limit);
 const dims={};
 for(const [key,value] of Object.entries(data?.scores||{})){
  const n=Number(value);
  dims[key]=Math.max(0,Math.min(100,Math.min(Number.isFinite(n)?Math.round(n):0,limit===100?100:limit+10)));
 }
 return {...data,overall_score:nextScore,scores:dims,
  scoring_integrity:{limited:limit<100,limit,reason,student_turns:turnCount}};
}
