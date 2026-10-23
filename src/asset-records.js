/* Private local metadata only. Never fetch or write linked source references. */
(function(root){
'use strict';
const VERSION=1,MAX_ASSETS=1000;
const fieldLimits={name:160,room:160,manufacturer:240,model:240,notes:6000};
const authorities=['user','imported-source','unverified'];
const sourceStates=['unverified','available-at-import','unavailable','changed'];
function obj(v,label){if(!v||Array.isArray(v)||typeof v!=='object')throw Error('Invalid '+label);return v;}
function str(v,label,max,required=false){if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)||required&&!v.trim())throw Error('Invalid '+label);return v;}
function id(v,label='identity'){str(v,label,300,true);if(/\s/.test(v))throw Error('Invalid '+label);return v;}
function keys(v,allowed,label){for(const key of Object.keys(v))if(!allowed.includes(key))throw Error('Unsupported '+label+' field: '+key);}
function list(v,label,max){if(!Array.isArray(v)||v.length>max)throw Error('Invalid '+label);return v;}
function unique(values,label){if(new Set(values).size!==values.length)throw Error('Duplicate '+label);}
function timestamp(v,label){str(v,label,40,true);if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,19)!==v.slice(0,19))throw Error('Invalid '+label);return v;}
function uri(value,kind){
 str(value,'source reference',2000,true);if(/[\s\u0000-\u001f\u007f]|%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(value))throw Error('Invalid source reference');
 let url;try{url=new URL(value);}catch{throw Error('Invalid source reference');}
 if(url.protocol==='https:'&&url.hostname&&!url.username&&!url.password)return value;
 if(kind==='vault-note'&&url.protocol==='obsidian:'&&url.hostname==='open'&&!url.username&&!url.password&&!url.port&&!url.hash&&['','/'].includes(url.pathname)&&url.searchParams.get('file')?.trim()&&[...url.searchParams.keys()].every(k=>['vault','file'].includes(k))){
  for(const v of url.searchParams.values())if(/[\u0000-\u001f\u007f]/.test(v))throw Error('Invalid source reference');
  return value;
 }
 throw Error('Source reference must be credential-free HTTPS, or an obsidian://open vault-note reference.');
}
function source(input){
 obj(input,'asset source');keys(input,['id','label','kind','uri','revision','contentHash','status','importedAt'],'source');
 const out={id:id(input.id,'source identity'),label:str(input.label,'source label',240,true),kind:input.kind,uri:input.uri,status:input.status===undefined?'unverified':input.status};
 if(!['vault-note','manual','other'].includes(out.kind)||!sourceStates.includes(out.status))throw Error('Invalid source kind/status');
 out.uri=uri(input.uri,out.kind);
 for(const key of ['revision','contentHash'])if(input[key]!==undefined)out[key]=str(input[key],key,300,true);
 if(input.importedAt!==undefined)out.importedAt=timestamp(input.importedAt,'source import time');
 if(out.status==='available-at-import'&&!out.importedAt)throw Error('Available-at-import evidence requires importedAt.');
 return out;
}
function entry(input,kind){
 obj(input,kind+' entry');const allowed=kind==='maintenance'?['id','kind','text','date']:['id','text','status','recordedAt'];keys(input,allowed,kind);
 const out={id:id(input.id,kind+' identity'),text:str(input.text,kind+' text',2000,true)};
 if(kind==='maintenance'){
  if(!['schedule','history'].includes(input.kind))throw Error('Invalid maintenance kind');out.kind=input.kind;
  if(input.date!==undefined){str(input.date,'maintenance date',10,true);if(!/^\d{4}-\d\d-\d\d$/.test(input.date)||!Number.isFinite(Date.parse(input.date))||new Date(input.date).toISOString().slice(0,10)!==input.date)throw Error('Invalid maintenance date');out.date=input.date;}
 }else{
  if(!['open','resolved'].includes(input.status))throw Error('Invalid issue status');out.status=input.status;
  if(input.recordedAt!==undefined)out.recordedAt=timestamp(input.recordedAt,'issue time');
 }
 return out;
}
function record(input,context={}){
 obj(input,'asset');keys(input,['id','projectId',...Object.keys(fieldLimits),'linkedRefs','provenance','sources','maintenance','issues'],'asset');
 const out={id:id(input.id,'asset identity'),projectId:id(input.projectId,'asset project identity')};
 if(context.projectId!==undefined&&out.projectId!==context.projectId)throw Error('Foreign asset: project identity does not match.');
 for(const [key,max]of Object.entries(fieldLimits))out[key]=str(input[key]===undefined?'':input[key],key,max,key==='name');
 out.linkedRefs=list(input.linkedRefs===undefined?[]:input.linkedRefs,'asset links',1000).map(ref=>{id(ref,'linked item reference');if(!/^(base|item|comment|photo):.+$/.test(ref)&&ref!=='original:reference')throw Error('Invalid linked item reference');return ref;});unique(out.linkedRefs,'asset link');
 out.sources=list(input.sources===undefined?[]:input.sources,'asset sources',100).map(source);unique(out.sources.map(s=>s.id),'source identity');
 const provenance=obj(input.provenance===undefined?{}:input.provenance,'field provenance');keys(provenance,Object.keys(fieldLimits),'provenance');out.provenance={};
 for(const key of Object.keys(fieldLimits)){
  const p=provenance[key]===undefined?{authority:'unverified'}:obj(provenance[key],'field provenance');keys(p,['authority','sourceId'],'provenance');
  if(!authorities.includes(p.authority))throw Error('Invalid field authority');const result={authority:p.authority};
  if(p.sourceId!==undefined){result.sourceId=id(p.sourceId,'provenance source identity');if(!out.sources.some(s=>s.id===result.sourceId))throw Error('Unknown provenance source');}
  if(p.authority==='imported-source'&&!result.sourceId)throw Error('Imported-source authority requires a source reference');
  out.provenance[key]=result;
 }
 for(const kind of ['maintenance','issues']){out[kind]=list(input[kind]===undefined?[]:input[kind],kind,200).map(v=>entry(v,kind==='maintenance'?'maintenance':'issue'));unique(out[kind].map(v=>v.id),kind+' identity');}
 return out;
}
function validate(assets,context={}){
 if(context.projectId!==undefined)id(context.projectId,'project identity');
 const out=list(assets===undefined?[]:assets,'asset collection',MAX_ASSETS).map(v=>record(v,context));unique(out.map(v=>v.id),'asset identity');return out;
}
function createRecord(input){
 obj(input,'new asset');const out={...input,provenance:{}};
 for(const key of Object.keys(fieldLimits))out.provenance[key]={authority:'user'};
 return record(out,{projectId:input.projectId});
}
function updateRecord(current,patch){
 const before=record(current);obj(patch,'asset update');keys(patch,[...Object.keys(fieldLimits),'linkedRefs'],'asset update');
 const out={...before,provenance:{...before.provenance}};
 for(const key of Object.keys(patch)){
  out[key]=patch[key];
  if(Object.hasOwn(fieldLimits,key)&&patch[key]!==before[key])out.provenance[key]={authority:'user'};
 }
 return record(out,{projectId:before.projectId});
}
function findingsFor(assets,context={}){
 const findings=[],known=context.knownRefs===undefined?null:new Set(context.knownRefs);
 for(const asset of assets){
  if(known)for(const ref of asset.linkedRefs)if(!known.has(ref))findings.push({code:'missing-item-reference',assetId:asset.id,ref,message:'Linked item is unavailable; the stable reference is retained.'});
  for(const source of asset.sources){
   findings.push({code:'source-'+source.status,assetId:asset.id,sourceId:source.id,message:source.status==='available-at-import'?'Source was available at the recorded import time; current availability is unverified.':source.status==='changed'?'Source was reported changed; review dependent fields.':source.status==='unavailable'?'Source was reported unavailable; linked facts need review.':'Source has not been verified.'});
  }
  for(const [field,p]of Object.entries(asset.provenance))if(asset[field]&&p.authority==='unverified')findings.push({code:'unverified-field',assetId:asset.id,field,message:'Field is unverified; no authority is inferred from its value.'});
 }
 return findings;
}
function stageImport(payload,context){
 obj(payload,'asset import');obj(context,'asset import context');keys(payload,['assetSchemaVersion','projectId','assets'],'asset import');
 if(payload.assetSchemaVersion!==VERSION)throw Error('Unsupported asset import version');
 const projectId=id(context.projectId,'current project identity');if(payload.projectId!==projectId)throw Error('Foreign asset import: project identity does not match.');
 if(context.now!==undefined)timestamp(context.now,'preview time');
 const existing=validate(context.existingAssets,{projectId}),incoming=validate(payload.assets,{projectId});
 const existingIds=new Set(existing.map(v=>v.id));if(incoming.some(v=>existingIds.has(v.id)))throw Error('Asset import would replace an existing identity. Review edits separately.');
 const assets=validate([...existing,...incoming],{projectId});
 return {assets,findings:findingsFor(assets,context)};
}
root.AssetRecords=Object.freeze({VERSION,MAX_ASSETS,validate,createRecord,updateRecord,stageImport,findings:findingsFor,inspectReferences:findingsFor});
})(typeof window==='undefined'?globalThis:window);
