/* Explicit schematic rings only. No inferred rooms, snapping, area or runtime hook. */
(function(root){
'use strict';
const VERSION=1,MAX_COORDINATE=1e9,MAX_RECORDS=1000,MAX_EDGES=64,MAX_SEGMENTS=20000,MAX_VIOLATIONS=96;
function object(value,label,allowed,required=[]){if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw Error('Invalid '+label);for(const key of Reflect.ownKeys(value)){const d=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!d.enumerable||!Object.hasOwn(d,'value')||!allowed.includes(key))throw Error('Unsupported '+label+' field');}for(const key of required)if(!Object.hasOwn(value,key))throw Error('Missing '+label+' field: '+key);return value;}
function array(value,label,max,min=0){if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length<min||value.length>max||Reflect.ownKeys(value).length!==value.length+1)throw Error('Invalid '+label);for(let i=0;i<value.length;i++){const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d||!d.enumerable||!Object.hasOwn(d,'value'))throw Error('Invalid '+label+' slot');}return value;}
function validId(value){return typeof value==='string'&&!!value&&value.length<=300&&!/[\s\u0000-\u001f\u007f]/.test(value);}
function id(value,label){if(!validId(value))throw Error('Invalid '+label);return value;}
function validate(records,context={}){
 object(context,'validation context',['projectId']);if(context.projectId!==undefined)id(context.projectId,'project identity');array(records,'room declarations',MAX_RECORDS);
 const ids=new Set(),out=[];
 for(const record of records){object(record,'room declaration',['id','projectId','sourceHashAtCreation','frameId','intent','edges'],['id','projectId','sourceHashAtCreation','frameId','intent','edges']);
  const item={id:id(record.id,'declaration identity'),projectId:id(record.projectId,'project identity'),sourceHashAtCreation:id(record.sourceHashAtCreation,'declaration source hash'),frameId:id(record.frameId,'declaration frame'),intent:record.intent,edges:[]};
  if(context.projectId!==undefined&&item.projectId!==context.projectId)throw Error('Foreign room declaration');if(ids.has(item.id))throw Error('Duplicate room declaration identity');ids.add(item.id);if(!['enclosure','open-plan-zone'].includes(item.intent))throw Error('Invalid room declaration intent');
  array(record.edges,'directed ring edges',MAX_EDGES,4);const refs=new Set();
  for(const edge of record.edges){object(edge,'directed edge',['segmentId','startEndpoint'],['segmentId','startEndpoint']);const ref=id(edge.segmentId,'segment reference');if(refs.has(ref))throw Error('Duplicate ring segment reference');refs.add(ref);if(!['a','b'].includes(edge.startEndpoint))throw Error('Invalid directed endpoint');item.edges.push({segmentId:ref,startEndpoint:edge.startEndpoint});}
  out.push(item);
 }
 return out;
}
function createDeclaration(input){object(input,'new room declaration',['id','projectId','sourceHash','frameId','intent','edges'],['id','projectId','sourceHash','frameId','intent','edges']);return validate([{id:input.id,projectId:input.projectId,sourceHashAtCreation:input.sourceHash,frameId:input.frameId,intent:input.intent,edges:input.edges}],{projectId:input.projectId})[0];}
function point(value){if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length!==2||Reflect.ownKeys(value).length!==3)return null;const a=Object.getOwnPropertyDescriptor(value,'0'),b=Object.getOwnPropertyDescriptor(value,'1');if(!a||!b||!a.enumerable||!b.enumerable||!Object.hasOwn(a,'value')||!Object.hasOwn(b,'value'))return null;return [a.value,b.value].every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=MAX_COORDINATE)?[a.value,b.value]:null;}
const equal=(a,b)=>a[0]===b[0]&&a[1]===b[1];
const between=(v,a,b)=>v>=Math.min(a,b)&&v<=Math.max(a,b);
function contact(a,b){
 if(a.axis===b.axis){const along=a.axis==='h'?0:1,across=1-along;if(a.a[across]!==b.a[across])return null;const low=Math.max(Math.min(a.a[along],a.b[along]),Math.min(b.a[along],b.b[along])),high=Math.min(Math.max(a.a[along],a.b[along]),Math.max(b.a[along],b.b[along]));if(low>high)return null;if(low<high)return {kind:'overlap'};const p=[0,0];p[along]=low;p[across]=a.a[across];return {kind:'point',point:p};}
 const h=a.axis==='h'?a:b,v=a.axis==='v'?a:b,p=[v.a[0],h.a[1]];return between(p[0],h.a[0],h.b[0])&&between(p[1],v.a[1],v.b[1])?{kind:'point',point:p}:null;
}
function evaluate(input){
 object(input,'room evaluation',['records','projectId','sourceHash','frameId','segments','unsupported'],['records']);
 if(input.projectId!==undefined)id(input.projectId,'current project identity');const records=validate(input.records,input.projectId===undefined?{}:{projectId:input.projectId}),segments=input.segments===undefined?[]:array(input.segments,'geometry evidence',MAX_SEGMENTS),upstreamProvided=Object.hasOwn(input,'unsupported'),unsupported=upstreamProvided?array(input.unsupported,'unsupported evidence',MAX_SEGMENTS):[];
 for(const value of unsupported)if(typeof value!=='string'||!value.trim()||value.length>2000)throw Error('Invalid unsupported evidence message');
 const global=[];if(input.projectId===undefined)global.push('current-project-identity-unavailable');if(!validId(input.sourceHash))global.push('current-source-hash-unavailable');if(!validId(input.frameId))global.push('current-frame-unavailable');if(input.segments===undefined)global.push('geometry-evidence-unavailable');if(!upstreamProvided)global.push('unsupported-evidence-unavailable');else if(unsupported.length)global.push('upstream-unsupported-evidence');
 const index=new Map();for(const segment of segments){object(segment,'segment evidence',['id','kind','a','b','sourceHash','frameId','coordinateStatus'],['id']);id(segment.id,'segment evidence identity');if(!index.has(segment.id))index.set(segment.id,[]);index.get(segment.id).push(segment);}
 const findings=records.map(record=>{
  const unknown=[...global],unresolved=[],resolved=[],codes=new Set(),violations=[];let violationCount=0;
  if(record.sourceHashAtCreation!==input.sourceHash)unknown.push('stale-declaration-source');if(record.frameId!==input.frameId)unknown.push('stale-declaration-frame');if(record.intent==='open-plan-zone')unknown.push('open-plan-zone-not-supported');
  const violation=(code,edgeIndices)=>{codes.add(code);violationCount++;if(violations.length<MAX_VIOLATIONS)violations.push({code,edgeIndices:[...edgeIndices],segmentIds:edgeIndices.map(i=>record.edges[i].segmentId)});};
  for(let i=0;i<record.edges.length;i++){const edge=record.edges[i],found=index.get(edge.segmentId)||[],reasons=[];let geometry=null;
   if(found.length!==1)reasons.push(found.length?'ambiguous-segment-reference':'missing-segment-reference');
   else{const s=found[0],a=point(s.a),b=point(s.b);if(!['wall','window','opening'].includes(s.kind))reasons.push('unsupported-segment-semantics');if(s.coordinateStatus!=='supported')reasons.push('unsupported-coordinate-status');if(!validId(s.sourceHash)||s.sourceHash!==input.sourceHash)reasons.push('unmatched-segment-source');if(!validId(s.frameId)||s.frameId!==input.frameId)reasons.push('unmatched-segment-frame');if(!a||!b)reasons.push('unsupported-coordinate-values');else if(equal(a,b))reasons.push('degenerate-segment');else if(a[0]!==b[0]&&a[1]!==b[1])reasons.push('oblique-segment');if(!reasons.length){const start=edge.startEndpoint==='a'?a:b,end=edge.startEndpoint==='a'?b:a;geometry={a:start,b:end,axis:start[1]===end[1]?'h':'v'};}}
   if(reasons.length){unknown.push(...reasons);unresolved.push({edgeIndex:i,segmentId:edge.segmentId,reasons});}resolved.push(geometry);
  }
  const n=resolved.length;
  for(let i=0;i<n;i++){const j=(i+1)%n;if(resolved[i]&&resolved[j]&&!equal(resolved[i].b,resolved[j].a))violation(i===n-1?'final-closure-mismatch':'consecutive-endpoint-mismatch',[i,j]);}
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const a=resolved[i],b=resolved[j];if(!a||!b)continue;const hit=contact(a,b);if(!hit)continue;const adjacent=j===i+1||i===0&&j===n-1;
   if(hit.kind==='overlap')violation(adjacent?'adjacent-overlap-or-retrace':'nonadjacent-overlap-or-retrace',[i,j]);
   else if(!adjacent)violation(!equal(hit.point,a.a)&&!equal(hit.point,a.b)&&!equal(hit.point,b.a)&&!equal(hit.point,b.b)?'nonadjacent-crossing':'nonadjacent-touch',[i,j]);
   else{const end=j===i+1?a.b:b.b,start=j===i+1?b.a:a.a;if(!equal(hit.point,end)||!equal(hit.point,start))violation('adjacent-contact-not-shared-endpoint',[i,j]);}
  }
  if(resolved.every(Boolean)){let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const s of resolved)for(const p of [s.a,s.b]){minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);}if(minX===maxX||minY===maxY)violation('zero-ring-extent',[]);}
  const reasons=[...new Set(unknown)],status=reasons.length?'unknown':violationCount?'fail':'pass';
  const resolvedEdges=resolved.flatMap((s,i)=>{if(!s)return [];const edge=record.edges[i],source=index.get(edge.segmentId)[0];return [{edgeIndex:i,segmentId:edge.segmentId,kind:source.kind,startEndpoint:edge.startEndpoint,a:[...s.a],b:[...s.b],sourceHash:source.sourceHash,frameId:source.frameId}];});
  return {declarationId:record.id,status,code:reasons[0]||[...codes][0]||'closed-simple-orthogonal-ring',affectedIds:[record.id,...record.edges.map(e=>e.segmentId)],declaration:record,evidence:{scope:'Explicit schematic topology only; no physical enclosure, area, calibration or compliance claim.',currentSourceHash:validId(input.sourceHash)?input.sourceHash:null,currentFrameId:validId(input.frameId)?input.frameId:null,unknownReasons:reasons,unresolvedEdges:unresolved,resolvedEdges,declaredEdgeCount:n,resolvedEdgeCount:resolved.filter(Boolean).length,numericalViolationCount:violationCount,numericalViolationCodes:[...codes],violations,violationsTruncated:violationCount>violations.length,violationSampleLimit:MAX_VIOLATIONS,unsupportedCount:upstreamProvided?unsupported.length:null}};
 });
 const reasons=[...global];if(!records.length)reasons.push('no-room-declarations');
 return {coverage:{scope:'explicit-declared-schematic-rings-only',roomDiscoveryPerformed:false,physicalEnclosureVerified:false},status:!records.length||findings.some(f=>f.status==='unknown')?'unknown':findings.some(f=>f.status==='fail')?'fail':'pass',total:records.length,checked:findings.filter(f=>f.status!=='unknown').length,knownViolationCount:findings.reduce((sum,f)=>sum+f.evidence.numericalViolationCount,0),reasons,findings,upstream:{unsupportedProvided:upstreamProvided,unsupportedCount:upstreamProvided?unsupported.length:null,unsupportedSample:unsupported.slice(0,10).map(s=>s.slice(0,200)),unsupportedTruncated:unsupported.length>10||unsupported.slice(0,10).some(s=>s.length>200),sampleLimit:10,sampleCharacterLimit:200}};
}
root.RoomBoundaries=Object.freeze({VERSION,MAX_COORDINATE,MAX_RECORDS,MAX_EDGES,MAX_SEGMENTS,MAX_VIOLATIONS,validate,createDeclaration,evaluate});
})(typeof window==='undefined'?globalThis:window);
