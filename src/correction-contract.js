/* Manual, provider-neutral correction transport. No project data or permissions. */
(function(root){
'use strict';
const VERSION=1;
const CAPABILITIES=Object.freeze({transport:'manual-private-json',correction:'reviewed-source-replacement',operations:Object.freeze(['replace-base-svg','resolve-existing-comments']),reviewRequired:true,liveProviderIntegration:false});
const payloadFields=['project','comments','changeLog','items','objectSettings','originalReference','photoReferences','notes','calibration','checks','consistencyReports','baseSvg','assets'];
function object(value,label){if(!value||Array.isArray(value)||typeof value!=='object')throw Error('Invalid '+label);return value;}
function text(value,label,max=300){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Invalid '+label);return value;}
function strings(value,label,limit=20000){if(!Array.isArray(value)||value.length>limit||value.some(v=>typeof v!=='string'||!v.trim()||v.length>300)||new Set(value).size!==value.length)throw Error('Invalid '+label);return [...value];}
function copy(value){return JSON.parse(JSON.stringify(value));}
function createHandoff(input){
 object(input,'handoff');
 const out={contractVersion:VERSION,projectId:text(input.projectId,'project identity'),stateToken:text(input.stateToken,'state token'),baseRevision:text(input.revision,'revision'),baseSourceHash:text(input.sourceHash,'source hash'),selectedRefs:strings(input.selectedRefs||[],'selected references'),instructions:input.instructions===undefined?'':input.instructions,capabilities:copy(CAPABILITIES)};
 if(typeof out.instructions!=='string'||out.instructions.length>20000)throw Error('Invalid instructions');
 const payload=object(input.payload||{},'handoff payload');
 for(const key of payloadFields)if(Object.hasOwn(payload,key))out[key]=copy(payload[key]);
 return out;
}
function validateCorrection(payload,context){
 object(payload,'correction');object(context,'correction context');
 const legacy=payload.contractVersion===undefined;
 if(legacy&&!context.allowLegacy)throw Error('Legacy correction requires explicit compatibility approval. Export a fresh handoff.');
 if(!legacy&&payload.contractVersion!==VERSION)throw Error('Unsupported correction contract version');
 if(!legacy){
  text(context.projectId,'current project identity');text(context.stateToken,'current state token');
  if(text(payload.projectId,'project identity')!==context.projectId)throw Error('Foreign correction: project identity does not match.');
  if(text(payload.stateToken,'state token')!==context.stateToken)throw Error('Stale correction: project state changed. Export a fresh handoff.');
 }
 if(text(payload.baseRevision,'base revision')!==context.revision||text(payload.baseSourceHash,'base source hash')!==context.sourceHash)throw Error('Stale correction: revision or source does not match.');
 text(payload.newBaseSvg,'replacement SVG',2_000_000);
 const out={...(legacy?{}:{contractVersion:VERSION,projectId:payload.projectId,stateToken:payload.stateToken}),baseRevision:payload.baseRevision,baseSourceHash:payload.baseSourceHash,newBaseSvg:payload.newBaseSvg,warnings:legacy?['Legacy correction has no project/state identity. Revision and source checks cannot detect an undone branch; re-exporting a current handoff is safest.']:[]};
 if(payload.resolvedCommentIds!==undefined){
  out.resolvedCommentIds=strings(payload.resolvedCommentIds,'resolved comment references',5000);
  const known=new Set(context.commentIds||[]);if(out.resolvedCommentIds.some(id=>!known.has(id)))throw Error('Correction references an unknown comment');
 }
 if(payload.selectedRefs!==undefined){
  out.selectedRefs=strings(payload.selectedRefs,'selected references');
  const known=new Set(context.itemRefs||[]);if(out.selectedRefs.some(ref=>!known.has(ref)))throw Error('Correction references an unknown item');
 }
 if(payload.changeSummary!==undefined){if(typeof payload.changeSummary!=='string'||payload.changeSummary.length>3000)throw Error('Invalid change summary');out.changeSummary=payload.changeSummary;}
 if(payload.provider!==undefined)out.provider=text(payload.provider,'provider label',80);
 return out;
}
root.CorrectionContract=Object.freeze({VERSION,CAPABILITIES,createHandoff,validateCorrection});
})(typeof window==='undefined'?globalThis:window);
