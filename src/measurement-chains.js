/* User-selected single-axis source dimension totals; no inferred architectural topology. */
(function(root){
'use strict';
const EPSILON=1e-7,MAX_COORDINATE=1e9,factors={mm:1,cm:10,m:1000};
function obj(v,label){if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid '+label);return v;}
function id(v,label){if(typeof v!=='string'||!v||v.length>300||/[\s\u0000-\u001f\u007f]/.test(v))throw Error('Invalid '+label);return v;}
function keys(v,allowed){for(const k of Object.keys(v))if(!allowed.includes(k))throw Error('Unsupported measurement chain field: '+k);}
function validate(chains,context={}){
 obj(context,'chain context');if(context.projectId!==undefined)id(context.projectId,'project identity');if(chains===undefined)return [];
 if(!Array.isArray(chains)||chains.length>1000)throw Error('Invalid measurement chains');
 const out=chains.map(c=>{
  obj(c,'measurement chain');keys(c,['id','projectId','spanAnchorIds','totalAnchorId','sourceHashAtCreation','createdAt']);
  const v={id:id(c.id,'chain identity'),projectId:id(c.projectId,'chain project identity'),spanAnchorIds:[],totalAnchorId:id(c.totalAnchorId,'total anchor reference'),sourceHashAtCreation:id(c.sourceHashAtCreation,'chain source hash')};
  if(context.projectId!==undefined&&v.projectId!==context.projectId)throw Error('Foreign measurement chain');
  if(!Array.isArray(c.spanAnchorIds)||c.spanAnchorIds.length<2||c.spanAnchorIds.length>8)throw Error('A chain needs 2 to 8 ordered span anchors');
  v.spanAnchorIds=c.spanAnchorIds.map(a=>id(a,'span anchor reference'));
  if(new Set(v.spanAnchorIds).size!==v.spanAnchorIds.length||v.spanAnchorIds.includes(v.totalAnchorId))throw Error('Duplicate chain anchor reference');
  if(c.createdAt!==undefined){if(typeof c.createdAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(c.createdAt)||!Number.isFinite(Date.parse(c.createdAt))||new Date(c.createdAt).toISOString().slice(0,19)!==c.createdAt.slice(0,19))throw Error('Invalid chain creation time');v.createdAt=c.createdAt;}
  return v;
 });
 if(new Set(out.map(c=>c.id)).size!==out.length)throw Error('Duplicate chain identity');return out;
}
function createChain(input){obj(input,'new measurement chain');keys(input,['id','projectId','spanAnchorIds','totalAnchorId','sourceHash','createdAt']);const {sourceHash,...rest}=input;return validate([{...rest,sourceHashAtCreation:sourceHash}],{projectId:input.projectId})[0];}
function index(values,label){if(!Array.isArray(values)||values.length>20000)throw Error('Invalid '+label);const map=new Map();for(const v of values)if(v&&typeof v.id==='string'){const found=map.get(v.id)||[];found.push(v);map.set(v.id,found);}return map;}
const point=p=>Array.isArray(p)&&p.length===2&&p.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=MAX_COORDINATE);
function topology(entries,reasons){
 if(entries.some(e=>!point(e.start)||!point(e.end))){reasons.push('missing-or-invalid-chain-geometry');return null;}
 const spans=entries.slice(0,-1),total=entries.at(-1),first=spans[0];
 const dx=Math.abs(first.end[0]-first.start[0]),dy=Math.abs(first.end[1]-first.start[1]);
 const axis=dy<=EPSILON&&dx>EPSILON?0:dx<=EPSILON&&dy>EPSILON?1:null;
 if(axis===null){reasons.push('chain-not-single-axis');return null;}
 const cross=1-axis,baseline=first.start[cross];
 if(entries.some(e=>Math.abs(e.start[cross]-baseline)>EPSILON||Math.abs(e.end[cross]-baseline)>EPSILON)){reasons.push('chain-not-collinear');return {axis:axis===0?'x':'y'};}
 const intervals=spans.map(e=>({min:Math.min(e.start[axis],e.end[axis]),max:Math.max(e.start[axis],e.end[axis])}));
 if(intervals.some(e=>e.max-e.min<=EPSILON)){reasons.push('zero-length-chain-span');return {axis:axis===0?'x':'y'};}
 const direction=intervals[1].min>intervals[0].min?1:-1;
 for(let i=1;i<intervals.length;i++){
  const prev=intervals[i-1],next=intervals[i];
  if(direction*(next.min-prev.min)<=EPSILON){reasons.push('chain-backtracking-or-overlap');break;}
  const gap=direction>0?next.min-prev.max:prev.min-next.max;
  if(gap>EPSILON){reasons.push('chain-gap');break;}
  if(gap< -EPSILON){reasons.push('chain-overlap');break;}
 }
 const outer=[direction>0?intervals[0].min:intervals[0].max,direction>0?intervals.at(-1).max:intervals.at(-1).min].sort((a,b)=>a-b);
 const totalInterval=[total.start[axis],total.end[axis]].sort((a,b)=>a-b);
 if(outer.some((v,i)=>Math.abs(v-totalInterval[i])>EPSILON))reasons.push('total-endpoints-do-not-match-chain');
 return {axis:axis===0?'x':'y',direction:direction>0?'ascending':'descending',intervals,outer,totalInterval,epsilonDrawingUnits:EPSILON};
}
function review(input){
 obj(input,'chain review');if(!root.MeasurementAnchors)throw Error('MeasurementAnchors must load before MeasurementChains');
 const chains=validate(input.chains,{projectId:input.projectId}),anchorIndex=index(input.anchors||[],'anchors'),dimensionIndex=index(input.dimensions||[],'dimensions');
 if(input.tolerancePercent!==undefined&&input.tolerancePercent!==null&&(typeof input.tolerancePercent!=='number'||!Number.isFinite(input.tolerancePercent)||input.tolerancePercent<0||input.tolerancePercent>100))throw Error('Tolerance must be an explicit number from 0 to 100 percent.');
 let checked=0;
 const findings=chains.map(chain=>{
  const reasons=[],entries=[],affectedIds=[chain.id,...chain.spanAnchorIds,chain.totalAnchorId];
  if(chain.sourceHashAtCreation!==input.sourceHash)reasons.push('stale-chain');
  const refs=[...chain.spanAnchorIds,chain.totalAnchorId];
  for(const ref of refs){
   const candidates=anchorIndex.get(ref)||[];
   if(candidates.length!==1){reasons.push(candidates.length?'ambiguous-chain-anchor':'missing-chain-anchor');entries.push({anchorId:ref,start:null,end:null,declaredMillimetres:null});continue;}
   const anchor=candidates[0];let review;
   try{review=root.MeasurementAnchors.review({...input,anchors:[anchor]});}catch{reasons.push('invalid-chain-anchor');entries.push({anchorId:ref,start:null,end:null,declaredMillimetres:null});continue;}
   const f=review.findings[0],ds=dimensionIndex.get(anchor.dimensionId)||[],d=ds.length===1?ds[0]:null;
   affectedIds.push(...f.affectedIds);
   if(!review.checked)reasons.push(...f.evidence.reasons.map(code=>'anchor:'+code));
   const raw=d&&Object.hasOwn(factors,d.unit)&&typeof d.value==='number'&&Number.isFinite(d.value)&&d.value>0?d.value*factors[d.unit]:null;
   const declaredMillimetres=Number.isFinite(raw)&&raw>0?raw:null;
   if(raw!==null&&declaredMillimetres===null)reasons.push('declared-unit-conversion-overflow');
   entries.push({anchorId:ref,dimensionId:anchor.dimensionId,declaredValue:d&&Number.isFinite(d.value)?d.value:null,declaredUnit:d&&typeof d.unit==='string'?d.unit:null,declaredMillimetres,geometricMeasured:f.measured,geometricUnit:f.unit,anchorStatus:f.status,start:f.evidence.start.point,end:f.evidence.end.point,anchorEvidence:f.evidence});
  }
  const dimensionRefs=entries.map(e=>e.dimensionId).filter(v=>v!==undefined);
  if(new Set(dimensionRefs).size!==dimensionRefs.length)reasons.push('repeated-source-dimension');
  const geometry=topology(entries,reasons),values=entries.slice(0,-1).map(e=>e.declaredMillimetres);
  const sum=values.every(v=>v!==null)?values.reduce((a,b)=>a+b,0):null;
  const measured=Number.isFinite(sum)&&sum>0?sum:null,expected=entries.at(-1).declaredMillimetres;
  const rawError=measured!==null&&expected!==null?100*(measured/expected-1):null,errorPercent=Number.isFinite(rawError)?rawError:null;
  if(sum!==null&&measured===null||rawError!==null&&errorPercent===null)reasons.push('chain-numeric-overflow');
  if(measured===null||expected===null)reasons.push('missing-declared-chain-measurement');
  const uniqueReasons=[...new Set(reasons)];
  const verified=!uniqueReasons.length;if(verified)checked++;
  const status=verified?(Math.abs(errorPercent)<=input.tolerancePercent?'pass':'fail'):'unknown';
  return {chainId:chain.id,code:status==='unknown'?uniqueReasons[0]:status==='pass'?'declared-chain-within-tolerance':'declared-chain-total-mismatch',status,severity:status==='fail'?'error':status==='unknown'?'warning':'info',affectedIds:[...new Set(affectedIds)],measured,expected,unit:'mm',errorPercent,evidence:{bindingSourceHash:chain.sourceHashAtCreation,currentSourceHash:typeof input.sourceHash==='string'?input.sourceHash:null,tolerancePercent:input.tolerancePercent===undefined?null:input.tolerancePercent,reasons:uniqueReasons,comparison:'sum of declared source span dimensions versus declared source total',geometry,anchors:entries}};
 });
 return {findings,total:chains.length,checked,status:findings.some(f=>f.status==='fail')?'fail':!findings.length||findings.some(f=>f.status==='unknown')?'unknown':'pass'};
}
root.MeasurementChains=Object.freeze({EPSILON,MAX_COORDINATE,validate,createChain,review});
})(typeof window==='undefined'?globalThis:window);
