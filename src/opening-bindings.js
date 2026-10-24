/* Explicit schematic opening/jamb declarations. Never infer, snap or edit geometry. */
(function(root){
'use strict';
const EPSILON=1e-7,MAX_COORDINATE=1e9,MAX_RECORDS=1000,MAX_CONFLICT_REFS=96;
function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid '+label);return value;}
function keys(value,allowed,label){for(const key of Object.keys(value))if(!allowed.includes(key))throw Error('Unsupported '+label+' field: '+key);}
function id(value,label){if(typeof value!=='string'||!value||value.length>300||/[\s\u0000-\u001f\u007f]/.test(value))throw Error('Invalid '+label);return value;}
function endpoint(value){object(value,'wall endpoint');keys(value,['segmentId','endpoint'],'wall endpoint');if(!['a','b'].includes(value.endpoint))throw Error('Invalid wall endpoint selector');return {segmentId:id(value.segmentId,'wall segment reference'),endpoint:value.endpoint};}
function validate(records,context={}){
 object(context,'opening validation context');if(context.projectId!==undefined)id(context.projectId,'project identity');
 if(records===undefined)return [];if(!Array.isArray(records)||records.length>MAX_RECORDS)throw Error('Invalid opening bindings');
 const result=records.map(record=>{
  object(record,'opening binding');keys(record,['id','projectId','openingSegmentId','startJamb','endJamb','sourceHashAtCreation','createdAt'],'opening binding');
  const out={id:id(record.id,'binding identity'),projectId:id(record.projectId,'project identity'),openingSegmentId:id(record.openingSegmentId,'opening segment reference'),startJamb:endpoint(record.startJamb),endJamb:endpoint(record.endJamb),sourceHashAtCreation:id(record.sourceHashAtCreation,'binding source hash')};
  if(context.projectId!==undefined&&out.projectId!==context.projectId)throw Error('Foreign opening binding');
  if(new Set([out.openingSegmentId,out.startJamb.segmentId,out.endJamb.segmentId]).size!==3)throw Error('An opening and its two wall segments need distinct references');
  if(record.createdAt!==undefined){const time=record.createdAt;if(typeof time!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(time)||!Number.isFinite(Date.parse(time))||new Date(time).toISOString().slice(0,19)!==time.slice(0,19))throw Error('Invalid opening binding creation time');out.createdAt=time;}
  return out;
 });
 if(new Set(result.map(v=>v.id)).size!==result.length)throw Error('Duplicate opening binding identity');
 if(new Set(result.map(v=>v.openingSegmentId)).size!==result.length)throw Error('Duplicate opening segment binding');
 return result;
}
function createBinding(input){object(input,'new opening binding');keys(input,['id','projectId','openingSegmentId','startJamb','endJamb','sourceHash','createdAt'],'new opening binding');const {sourceHash,...rest}=input;return validate([{...rest,sourceHashAtCreation:sourceHash}],{projectId:input.projectId})[0];}
const point=value=>Array.isArray(value)&&value.length===2&&value.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=MAX_COORDINATE);
const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const usable=segment=>segment&&point(segment.a)&&point(segment.b)&&distance(segment.a,segment.b)>EPSILON;
const validId=value=>typeof value==='string'&&!!value&&value.length<=300&&!/[\s\u0000-\u001f\u007f]/.test(value);
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
function wallConflict(opening,wall){
 const r=[opening.b[0]-opening.a[0],opening.b[1]-opening.a[1]],s=[wall.b[0]-wall.a[0],wall.b[1]-wall.a[1]],q=[wall.a[0]-opening.a[0],wall.a[1]-opening.a[1]],length=Math.hypot(...r);
 const offset=p=>Math.abs(cross(r,[p[0]-opening.a[0],p[1]-opening.a[1]]))/length;
 if(offset(wall.a)<=EPSILON&&offset(wall.b)<=EPSILON){
  const projection=p=>((p[0]-opening.a[0])*r[0]+(p[1]-opening.a[1])*r[1])/length,a=projection(wall.a),b=projection(wall.b);
  return Math.min(length,Math.max(a,b))-Math.max(0,Math.min(a,b))>EPSILON?'wall-overlaps-opening':null;
 }
 const denominator=cross(r,s);if(denominator===0)return null;
 const t=cross(q,s)/denominator,u=cross(q,r)/denominator,wallLength=Math.hypot(...s);
 return Number.isFinite(t)&&Number.isFinite(u)&&t*length>EPSILON&&(1-t)*length>EPSILON&&u*wallLength>=-EPSILON&&(1-u)*wallLength>=-EPSILON?'wall-crosses-opening':null;
}
function evaluate(input){
 object(input,'opening evaluation');const records=validate(input.records,{projectId:input.projectId}),segments=input.segments===undefined?[]:input.segments,unsupported=input.unsupported===undefined?[]:input.unsupported;
 if(!Array.isArray(segments)||segments.length>20000)throw Error('Invalid extracted geometry');
 if(!Array.isArray(unsupported)||unsupported.length>20000||unsupported.some(v=>typeof v!=='string'||!v.trim()||v.length>2000))throw Error('Invalid unsupported geometry evidence');
 const index=new Map();for(const segment of segments)if(segment&&typeof segment.id==='string'){const found=index.get(segment.id)||[];found.push(segment);index.set(segment.id,found);}
 let checked=0;
 const findings=records.map(record=>{
  const unknown=[],failures=[],conflicts=[];
  if(input.projectId===undefined)unknown.push('project-identity-unavailable');
  if(!validId(input.sourceHash))unknown.push('current-source-hash-unavailable');
  if(record.sourceHashAtCreation!==input.sourceHash)unknown.push('stale-opening-binding');
  if(unsupported.length)unknown.push('unsupported-geometry');
  const get=ref=>{const found=index.get(ref)||[];if(found.length!==1){unknown.push(found.length?'ambiguous-segment-reference':'missing-segment-reference');return null;}if(!usable(found[0])){unknown.push('invalid-or-degenerate-segment');return null;}return found[0];};
  const opening=get(record.openingSegmentId),start=get(record.startJamb.segmentId),end=get(record.endJamb.segmentId);
  if(opening&&opening.kind!=='opening')failures.push('referenced-segment-is-not-opening');
  if(start&&start.kind!=='wall'||end&&end.kind!=='wall')failures.push('jamb-reference-is-not-wall');
  const startPoint=start?start[record.startJamb.endpoint]:null,endPoint=end?end[record.endJamb.endpoint]:null;
  const startGap=opening&&startPoint?distance(opening.a,startPoint):null,endGap=opening&&endPoint?distance(opening.b,endPoint):null;
  if(startGap!==null&&startGap>EPSILON)failures.push('opening-start-jamb-mismatch');
  if(endGap!==null&&endGap>EPSILON)failures.push('opening-end-jamb-mismatch');
  if(opening){
   const direction=[opening.b[0]-opening.a[0],opening.b[1]-opening.a[1]],length=distance(opening.a,opening.b),offset=p=>Math.abs(cross(direction,[p[0]-opening.a[0],p[1]-opening.a[1]]))/length;
   if([start,end].filter(Boolean).some(wall=>offset(wall.a)>EPSILON||offset(wall.b)>EPSILON))failures.push('host-walls-not-collinear');
   for(const segment of segments){
    if(!segment||!['wall','window','opening'].includes(segment.kind)){unknown.push('unsupported-segment-semantics');continue;}
    if(segment.kind!=='wall')continue;
    if(!validId(segment.id)){unknown.push('unavailable-wall-identity');continue;}
    if(!usable(segment)){unknown.push('unavailable-wall-conflict-coverage');continue;}
    if((index.get(segment.id)||[]).length!==1)unknown.push('ambiguous-wall-conflict-coverage');
    const conflict=wallConflict(opening,segment);if(conflict){failures.push(conflict);conflicts.push(segment.id);}
   }
  }
  const reasons=[...new Set(unknown)],violations=[...new Set(failures)],status=reasons.length?'unknown':violations.length?'fail':'pass';
  if(status!=='unknown')checked++;
  const measured=startGap!==null&&endGap!==null?Math.max(startGap,endGap):null,allConflictIds=[...new Set(conflicts)],conflictIds=allConflictIds.slice(0,MAX_CONFLICT_REFS);
  const evidence={projectId:input.projectId===undefined?null:input.projectId,bindingSourceHash:record.sourceHashAtCreation,currentSourceHash:validId(input.sourceHash)?input.sourceHash:null,epsilonDrawingUnits:EPSILON,scope:'Numerical schematic alignment only; not physical verification, calibration or construction tolerance.',opening:opening?{segmentId:opening.id,kind:typeof opening.kind==='string'?opening.kind:null,a:[...opening.a],b:[...opening.b]}:null,startJamb:{...record.startJamb,point:startPoint?[...startPoint]:null,gapDrawingUnits:startGap},endJamb:{...record.endJamb,point:endPoint?[...endPoint]:null,gapDrawingUnits:endGap},conflictingWallIds:conflictIds,conflictingWallCount:allConflictIds.length,conflictsTruncated:allConflictIds.length>conflictIds.length,conflictReferenceLimit:MAX_CONFLICT_REFS,reasons,violations,unsupportedCount:unsupported.length,unsupported:unsupported.slice(0,10).map(value=>value.slice(0,200)),unsupportedTruncated:unsupported.length>10||unsupported.slice(0,10).some(value=>value.length>200),unsupportedSampleLimit:10,unsupportedSampleCharacterLimit:200};
  return {bindingId:record.id,code:status==='unknown'?reasons[0]:status==='fail'?violations[0]:'opening-jambs-numerically-aligned',status,severity:status==='fail'?'error':status==='unknown'?'warning':'info',affectedIds:[...new Set([record.id,record.openingSegmentId,record.startJamb.segmentId,record.endJamb.segmentId,...conflictIds])],measured,expected:0,unit:'drawing-units',errorPercent:null,evidence};
 });
 return {findings,total:records.length,checked,status:findings.some(f=>f.status==='fail')?'fail':!findings.length||findings.some(f=>f.status==='unknown')?'unknown':'pass'};
}
function preview(input){object(input,'opening preview');const record=validate([input.binding],{projectId:input.projectId})[0];return {record,result:evaluate({...input,records:[record]})};}
root.OpeningBindings=Object.freeze({EPSILON,MAX_COORDINATE,MAX_RECORDS,MAX_CONFLICT_REFS,validate,createBinding,preview,evaluate});
})(typeof window==='undefined'?globalThis:window);
