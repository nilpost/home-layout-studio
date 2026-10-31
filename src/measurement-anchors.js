/* Explicit source-dimension bindings to selected schematic segment endpoints. */
(function(root){
'use strict';
const factors=Object.freeze({mm:1,cm:10,m:1000});
function obj(v,label){if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid '+label);return v;}
function keys(v,allowed,label){for(const k of Object.keys(v))if(!allowed.includes(k))throw Error('Unsupported '+label+' field: '+k);}
function id(v,label){if(typeof v!=='string'||!v.trim()||v.length>300||/[\s\u0000-\u001f\u007f]/.test(v))throw Error('Invalid '+label);return v;}
function endpoint(v){obj(v,'anchor endpoint');keys(v,['segmentId','endpoint'],'anchor endpoint');if(!['a','b'].includes(v.endpoint))throw Error('Invalid anchor endpoint selector');return {segmentId:id(v.segmentId,'segment reference'),endpoint:v.endpoint};}
function binding(v,context){
 obj(v,'measurement anchor');keys(v,['id','projectId','dimensionId','start','end','sourceHashAtCreation','createdAt'],'measurement anchor');
 const out={id:id(v.id,'anchor identity'),projectId:id(v.projectId,'anchor project identity'),dimensionId:id(v.dimensionId,'dimension reference'),start:endpoint(v.start),end:endpoint(v.end),sourceHashAtCreation:id(v.sourceHashAtCreation,'anchor source hash')};
 if(context.projectId!==undefined&&out.projectId!==context.projectId)throw Error('Foreign measurement anchor: project identity does not match.');
 if(v.createdAt!==undefined){if(typeof v.createdAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(v.createdAt)||!Number.isFinite(Date.parse(v.createdAt))||new Date(v.createdAt).toISOString().slice(0,19)!==v.createdAt.slice(0,19))throw Error('Invalid anchor creation time');out.createdAt=v.createdAt;}
 return out;
}
function validate(anchors,context={}){
 obj(context,'anchor validation context');if(context.projectId!==undefined)id(context.projectId,'project identity');
 if(anchors===undefined)return [];
 if(!Array.isArray(anchors)||anchors.length>5000)throw Error('Invalid measurement anchors');
 const out=anchors.map(a=>binding(a,context));
 if(new Set(out.map(a=>a.id)).size!==out.length)throw Error('Duplicate measurement anchor identity');
 if(new Set(out.map(a=>a.dimensionId)).size!==out.length)throw Error('Duplicate dimension binding: remove or explicitly replace its previous binding.');
 return out;
}
function createBinding(input){
 obj(input,'new measurement anchor');keys(input,['id','projectId','dimensionId','start','end','sourceHash','createdAt'],'new measurement anchor');
 const {sourceHash,...rest}=input;return validate([{...rest,sourceHashAtCreation:sourceHash}],{projectId:input.projectId})[0];
}
const point=v=>Array.isArray(v)&&v.length===2&&v.every(n=>typeof n==='number'&&Number.isFinite(n));
function index(values,label){if(!Array.isArray(values))throw Error('Invalid '+label);const out=new Map();for(const v of values)if(v&&typeof v.id==='string'){const found=out.get(v.id)||[];found.push(v);out.set(v.id,found);}return out;}
function review(input){
 obj(input,'anchored review');
 const anchors=validate(input.anchors,{projectId:input.projectId}),segments=index(input.segments||[],'segments'),dimensions=index(input.dimensions||[],'dimensions');
 const tolerance=input.tolerancePercent,hasTolerance=tolerance!==undefined&&tolerance!==null;
 if(hasTolerance&&(typeof tolerance!=='number'||!Number.isFinite(tolerance)||tolerance<0||tolerance>100))throw Error('Tolerance must be an explicit number from 0 to 100 percent.');
 const calibration=input.calibration,validScale=!!calibration&&[calibration.drawingUnits,calibration.realMillimetres].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0);
 const scale=validScale?calibration.realMillimetres/calibration.drawingUnits:null;
 const mmPerUnit=Number.isFinite(scale)&&scale>0?scale:null;
 let comparisons=0,verifiedComparisons=0;
 const findings=anchors.map(anchor=>{
  const reasons=[],ds=dimensions.get(anchor.dimensionId)||[],ss=segments.get(anchor.start.segmentId)||[],es=segments.get(anchor.end.segmentId)||[];
  const dim=ds.length===1?ds[0]:null,start=ss.length===1?ss[0][anchor.start.endpoint]:null,end=es.length===1?es[0][anchor.end.endpoint]:null;
  const evidence={bindingSourceHash:anchor.sourceHashAtCreation,currentSourceHash:typeof input.sourceHash==='string'?input.sourceHash:null,start:{...anchor.start,point:point(start)?[...start]:null},end:{...anchor.end,point:point(end)?[...end]:null},dimension:dim?{id:dim.id,value:Number.isFinite(dim.value)?dim.value:null,unit:typeof dim.unit==='string'?dim.unit:null,unitStatus:typeof dim.unitStatus==='string'?dim.unitStatus:'unverified'}:null,calibrationStatus:typeof calibration?.status==='string'?calibration.status:'unverified',mmPerDrawingUnit:mmPerUnit,tolerancePercent:hasTolerance?tolerance:null,drawingDistance:null,reasons};
  if(anchor.sourceHashAtCreation!==input.sourceHash)reasons.push('stale-binding');
  if(ds.length!==1)reasons.push(ds.length?'ambiguous-dimension':'missing-dimension');
  if(ss.length!==1||es.length!==1)reasons.push(ss.length>1||es.length>1?'ambiguous-segment':'missing-segment');
  else if(!point(start)||!point(end))reasons.push('invalid-endpoint-geometry');
  const length=point(start)&&point(end)?Math.hypot(end[0]-start[0],end[1]-start[1]):null;
  evidence.drawingDistance=Number.isFinite(length)?length:null;
  if(length===0)reasons.push('zero-length-binding');
  else if(length!==null&&!Number.isFinite(length))reasons.push('invalid-endpoint-geometry');
  const expected=dim&&typeof dim.value==='number'&&Number.isFinite(dim.value)&&dim.value>0?dim.value:null;
  if(dim&&expected===null)reasons.push('invalid-source-measurement');
  const unit=typeof dim?.unit==='string'?dim.unit:null,factor=Object.hasOwn(factors,unit)?factors[unit]:null;
  if(dim&&!factor)reasons.push('unsupported-or-mixed-unit');
  if(dim&&dim.unitStatus!=='verified')reasons.push('unverified-source-unit');
  if(mmPerUnit===null)reasons.push('missing-or-invalid-calibration');
  else if(calibration.status!=='verified')reasons.push('provisional-calibration');
  if(!hasTolerance)reasons.push('missing-explicit-tolerance');
  const raw=Number.isFinite(length)&&length>0&&mmPerUnit!==null&&factor?length*mmPerUnit/factor:null;
  const measured=Number.isFinite(raw)&&raw>0?raw:null;
  const error=measured!==null&&expected!==null?100*(measured/expected-1):null;
  const errorPercent=Number.isFinite(error)?error:null;
  if(raw!==null&&(measured===null||error!==null&&errorPercent===null))reasons.push('comparison-overflow');
  if(measured!==null&&expected!==null&&errorPercent!==null)comparisons++;
  const verified=!reasons.length;
  if(verified)verifiedComparisons++;
  const status=verified?(Math.abs(errorPercent)<=tolerance?'pass':'fail'):'unknown';
  const code=status==='unknown'?reasons[0]:status==='pass'?'anchored-dimension-within-tolerance':'anchored-dimension-mismatch';
  return {anchorId:anchor.id,code,status,severity:status==='fail'?'error':status==='unknown'?'warning':'info',affectedIds:[...new Set([anchor.id,anchor.dimensionId,anchor.start.segmentId,anchor.end.segmentId])],measured,expected,unit,errorPercent,evidence};
 });
 const unknown=findings.filter(f=>f.status==='unknown').length,total=anchors.length;
 const status=findings.some(f=>f.status==='fail')?'fail':!total||unknown?'unknown':'pass';
 const bound=new Set(anchors.map(a=>a.dimensionId));
 return {findings,total,checked:verifiedComparisons,status,coverage:{bindings:total,comparisons,verifiedComparisons,unknown,unboundDimensions:[...dimensions.keys()].filter(id=>!bound.has(id))}};
}
root.MeasurementAnchors=Object.freeze({validate,createBinding,review});
})(typeof window==='undefined'?globalThis:window);
